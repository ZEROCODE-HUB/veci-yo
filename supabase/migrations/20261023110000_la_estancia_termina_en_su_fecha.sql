-- ----------------------------------------------------------------------------
-- La estancia del huésped termina en su fecha, no cuando salen todos
-- (23/10/2026, decisión del cliente: «Opción B»)
-- ----------------------------------------------------------------------------
-- Hasta hoy una estancia pasaba a `finalizada` en cuanto no quedaba nadie
-- dentro. Una salida a cenar contaba como el fin: al anfitrión le llegaba
-- «estancia completa», se soltaba el estacionamiento y el QR dejaba de servir
-- (`estancia_por_codigo` no abre una finalizada), y al volver el guardia tenía
-- que deshacer la salida a mano.
--
-- Ahora, en una estancia de huésped:
--   · antes de su día de salida, salir no la termina: sigue `ingresada`;
--   · el día de salida (o después), cuando sale el último, termina;
--   · pasado el día de salida termina sola (tarea de cada hora), aunque nadie
--     haya marcado la salida;
--   · y el anfitrión la puede terminar antes con «Terminar estancia».
-- Las demás visitas siguen como estaban: terminan cuando sale el último.

alter table public.visita
  add column if not exists terminada_en  timestamptz,
  add column if not exists terminada_por uuid references auth.users(id) on delete set null;

comment on column public.visita.terminada_en is
  'Cuándo el anfitrión terminó la estancia antes de su fecha («Terminar estancia»). Null si terminó sola o sigue abierta.';
comment on column public.visita.terminada_por is
  'Quién terminó la estancia antes de su fecha. Lo pone `terminar_estancia`.';

-- El día de hoy en el edificio de la visita. Un `::date` a secas es el de UTC.
create or replace function public.hoy_en_el_edificio(p_condominio_id uuid)
returns date
language sql
stable
set search_path = public, pg_temp
as $fn$
  select (now() at time zone public.zona_horaria_del_condominio(p_condominio_id))::date;
$fn$;

comment on function public.hoy_en_el_edificio(uuid) is
  'La fecha de hoy con el reloj del edificio, para comparar con fechas de visita.';

revoke all on function public.hoy_en_el_edificio(uuid) from public, anon;
grant execute on function public.hoy_en_el_edificio(uuid) to authenticated, service_role;

-- Si una estancia de huésped ya terminó (o termina en este momento si no queda
-- nadie dentro). Una sola definición para el disparador, el aviso y la tarea.
create or replace function public.la_estancia_termina(p_visita_id uuid, p_dentro int)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $fn$
  select v.terminada_en is not null
      or public.hoy_en_el_edificio(v.condominio_id) > v.fecha_hasta
      or (p_dentro = 0 and public.hoy_en_el_edificio(v.condominio_id) >= v.fecha_hasta)
  from public.visita v
  where v.id = p_visita_id;
$fn$;

comment on function public.la_estancia_termina(uuid, int) is
  'Una estancia de huésped termina si el anfitrión la terminó, si ya pasó su día de salida, o si ese día (o después) no queda nadie dentro. Salir antes de esa fecha no la termina.';

revoke all on function public.la_estancia_termina(uuid, int) from public, anon, authenticated;
grant execute on function public.la_estancia_termina(uuid, int) to service_role;

create or replace function public.sincronizar_estado_visita()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare
  v_visita     uuid;
  v_tipo       public.tipo_visita;
  v_entraron   int;
  v_dentro     int;
  v_primera    timestamptz;
  v_ultima     timestamptz;
  v_estado     public.estado_visita;
  v_termino    boolean;
begin
  v_visita := coalesce(new.visita_id, old.visita_id);
  if v_visita is null then
    return coalesce(new, old);
  end if;

  select count(*) filter (where i.llego or i.ingreso_en is not null),
         count(*) filter (where (i.llego or i.ingreso_en is not null) and i.salida_en is null),
         min(i.ingreso_en),
         max(i.salida_en)
    into v_entraron, v_dentro, v_primera, v_ultima
  from public.invitado i
  where i.visita_id = v_visita;

  -- Una visita cancelada no vuelve sola: cancelarla es una decision de alguien,
  -- y que un invitado marque su llegada no la deshace.
  if (select v.estado from public.visita v where v.id = v_visita) = 'cancelada' then
    return coalesce(new, old);
  end if;

  select v.tipo into v_tipo from public.visita v where v.id = v_visita;

  if v_tipo = 'huesped_temporal' then
    -- La estancia termina en su fecha o cuando el anfitrion la termina; salir
    -- antes no la termina (23/10/2026).
    v_termino := v_entraron > 0 and public.la_estancia_termina(v_visita, v_dentro);
  else
    -- Termino si entro alguien y ya no queda nadie dentro. Quien no llego no
    -- la mantiene abierta; si llega despues, vuelve a «ingresada» sola.
    v_termino := v_entraron > 0 and v_dentro = 0;
  end if;

  if v_termino then
    v_estado := 'finalizada';
  elsif v_entraron > 0 then
    v_estado := 'ingresada';
  else
    -- Se puede volver atras: si el guardia desmarca una llegada que apunto por
    -- error, la visita vuelve a estar programada en vez de quedarse mintiendo.
    v_estado := 'programada';
  end if;

  update public.visita v
     set estado     = v_estado,
         ingreso_en = case when v_entraron > 0 then coalesce(v_primera, v.ingreso_en, now()) else null end,
         salida_en  = case when v_termino then coalesce(v_ultima, v.salida_en, now()) else null end,
         updated_at = now()
   where v.id = v_visita
     and (v.estado is distinct from v_estado
          or v.ingreso_en is distinct from (case when v_entraron > 0 then coalesce(v_primera, v.ingreso_en, now()) else null end)
          or v.salida_en is distinct from (case when v_termino then coalesce(v_ultima, v.salida_en, now()) else null end));

  return coalesce(new, old);
end;
$fn$;

-- El aviso al anfitrion cuando sale alguien: «estancia completa» solo si de
-- verdad termina; si no, que no queda nadie dentro y hasta cuando sigue.
create or replace function public.avisar_salida_de_huesped()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare
  v       public.visita%rowtype;
  dentro  int;
begin
  if new.salida_en is null or old.salida_en is not null then
    return new;
  end if;
  -- `terminar_estancia` marca las salidas que falten: el anfitrion ya lo sabe.
  if current_setting('veciyo.terminando_estancia', true) = 'si' then
    return new;
  end if;
  select * into v from public.visita where id = new.visita_id;
  if v.tipo <> 'huesped_temporal' then
    return new;
  end if;

  select count(*) into dentro
  from public.invitado i
  where i.visita_id = v.id and i.llego and i.salida_en is null;

  if dentro > 0 then
    perform public.notificar_anfitrion(
      v.unidad_id, 'huesped_salida_parcial',
      'Salió alguien de tu estancia',
      new.nombre || ' salió del edificio. ' ||
        case when dentro = 1 then 'Queda 1 persona dentro.'
             else 'Quedan ' || dentro || ' personas dentro.' end,
      'visita', v.id
    );
  elsif public.la_estancia_termina(v.id, 0) then
    perform public.notificar_anfitrion(
      v.unidad_id, 'huesped_salida',
      'Salieron todos: estancia completa',
      new.nombre || ' salió del edificio, el último de la estancia.',
      'visita', v.id
    );
  else
    perform public.notificar_anfitrion(
      v.unidad_id, 'huesped_salida_parcial',
      'No queda nadie dentro',
      new.nombre || ' salió del edificio y no queda nadie dentro. La estancia sigue abierta hasta el '
        || to_char(v.fecha_hasta, 'DD/MM/YYYY') || '.',
      'visita', v.id
    );
  end if;
  return new;
end;
$fn$;

-- El anfitrion termina la estancia antes de su fecha.
create or replace function public.terminar_estancia(p_visita_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare
  v public.visita%rowtype;
begin
  select * into v from public.visita where id = p_visita_id;
  if v.id is null or v.tipo <> 'huesped_temporal' then
    raise exception 'Esa estancia no existe';
  end if;
  if not public.puede_configurar_alojamiento(v.unidad_id) then
    raise exception 'Solo el anfitrion puede terminar la estancia';
  end if;
  if v.estado in ('cancelada', 'finalizada') then
    raise exception 'Esa estancia ya termino o se cancelo';
  end if;
  if not exists (
    select 1 from public.invitado i
    where i.visita_id = v.id and (i.llego or i.ingreso_en is not null)
  ) then
    raise exception 'Nadie ha entrado todavia: si no vienen, cancela la estancia';
  end if;

  update public.visita
     set terminada_en = now(), terminada_por = auth.uid()
   where id = v.id;

  -- Quien siga dentro sale ahora; asi la porteria no ve a nadie «dentro» de una
  -- estancia terminada. El disparador de estado la pasa a finalizada.
  perform set_config('veciyo.terminando_estancia', 'si', true);
  update public.invitado
     set salida_en = now()
   where visita_id = v.id
     and (llego or ingreso_en is not null)
     and salida_en is null;
  perform set_config('veciyo.terminando_estancia', '', true);

  -- Si ya habian salido todos, ningun invitado cambio: se cierra aqui.
  update public.visita
     set estado = 'finalizada',
         salida_en = coalesce(salida_en, now()),
         updated_at = now()
   where id = v.id and estado <> 'finalizada';
end;
$fn$;

comment on function public.terminar_estancia(uuid) is
  'El anfitrion termina una estancia de huesped antes de su fecha de salida. Marca la salida de quien siga dentro y la deja finalizada.';

revoke all on function public.terminar_estancia(uuid) from public, anon;
grant execute on function public.terminar_estancia(uuid) to authenticated, service_role;

-- Pasado el dia de salida, la estancia termina sola aunque nadie marque la
-- salida. Corre cada hora.
create or replace function public.terminar_estancias_vencidas()
returns int
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare
  n int;
begin
  update public.visita v
     set estado = 'finalizada',
         salida_en = coalesce(
           (select max(i.salida_en) from public.invitado i where i.visita_id = v.id),
           now()),
         updated_at = now()
   where v.tipo = 'huesped_temporal'
     and v.estado = 'ingresada'
     and v.deleted_at is null
     and public.hoy_en_el_edificio(v.condominio_id) > v.fecha_hasta;
  get diagnostics n = row_count;
  return n;
end;
$fn$;

comment on function public.terminar_estancias_vencidas() is
  'Termina las estancias de huesped cuyo dia de salida ya paso. La llama cada hora la tarea «estancias-vencidas».';

revoke all on function public.terminar_estancias_vencidas() from public, anon, authenticated;
grant execute on function public.terminar_estancias_vencidas() to service_role;

select cron.schedule('estancias-vencidas', '7 * * * *', 'select public.terminar_estancias_vencidas();');
