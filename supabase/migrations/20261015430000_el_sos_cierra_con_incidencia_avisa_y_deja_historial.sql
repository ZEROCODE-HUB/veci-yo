-- ----------------------------------------------------------------------------
-- El S.O.S. se cierra con incidencia, avisa al atenderse y deja historial
-- (15/10/2026, hueco 15)
-- ----------------------------------------------------------------------------
-- Tres cosas, de las cuatro del hueco (la cuarta --que el anfitrión se entere
-- si lo activó su huésped-- ya la hace `avisar_sos` desde esta mañana):
--
-- 1. El personal podía cerrar la alarma escribiendo directo en la tabla,
--    sin pasar por `atender_sos`, o sea sin dejar la incidencia. La pantalla
--    solo ofrece el botón bueno, pero la política lo permitía. Ahora la
--    escritura directa es solo de quien la activó --para cancelarla o decir
--    que ya lo atendieron--; el personal la cierra por `atender_sos`.
-- 2. Quien pidió auxilio no sabía si lo habían atendido. Ahora le llega el
--    aviso, y si era un huésped, también a quien vive en la vivienda.
-- 3. No había historial. `historial_sos` lo da: el personal, el de su
--    edificio; cada quien, las suyas.

drop policy if exists alarma_sos_cerrar on public.alarma_sos;
create policy alarma_sos_cerrar on public.alarma_sos
  for update to authenticated
  using (cerrada_en is null and usuario_id = auth.uid())
  with check (cerrada_por = auth.uid() and cierre in ('cancelada', 'atendida'));

comment on policy alarma_sos_cerrar on public.alarma_sos is
  'Solo quien la activó la cierra directo (cancelada, o «ya me atendieron»). El personal, por atender_sos, que exige la incidencia.';

create or replace function public.atender_sos(p_alarma_id uuid, p_que_paso text, p_que_vio text)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  a            public.alarma_sos%rowtype;
  v_unidad     text;
  v_id         uuid;
  v_es_huesped boolean;
  v_mensaje    text;
begin
  select * into a from public.alarma_sos where id = p_alarma_id for update;
  if a.id is null then
    raise exception 'Esa alarma no existe';
  end if;
  if not public.es_personal_condominio(a.condominio_id) then
    raise exception 'Solo la porteria o la administracion atienden un S.O.S.';
  end if;
  if a.cerrada_en is not null then
    raise exception 'Esa alarma ya estaba cerrada';
  end if;
  if coalesce(btrim(p_que_paso), '') = '' or coalesce(btrim(p_que_vio), '') = '' then
    raise exception 'Escribe que paso y que viste: queda como incidencia';
  end if;

  select codigo into v_unidad from public.unidad where id = a.unidad_id;

  insert into public.reclamo (
    condominio_id, unidad_id, tipo, categoria, area, titulo, descripcion,
    creado_por, alarma_sos_id
  ) values (
    a.condominio_id, a.unidad_id, 'reclamo', 'seguridad', 'condominio',
    'Incidencia de S.O.S.' || coalesce(' · vivienda ' || v_unidad, ''),
    'Qué pasó: ' || btrim(p_que_paso) || chr(10) || 'Qué vio la portería: ' || btrim(p_que_vio),
    auth.uid(), a.id
  )
  returning id into v_id;

  update public.alarma_sos
     set cerrada_en  = now(),
         cerrada_por = auth.uid(),
         cierre      = 'atendida'
   where id = a.id;

  -- Que se entere quien pidió auxilio (hueco 15). Y si era un huésped, quien
  -- vive en la vivienda, que ya recibió el aviso de la alarma.
  v_es_huesped := a.unidad_id is not null and exists (
    select 1 from public.membresia_unidad m
    where m.unidad_id = a.unidad_id and m.usuario_id = a.usuario_id
      and m.rol = 'huesped_temporal' and m.activo);

  v_mensaje := 'La portería atendió el S.O.S.'
    || coalesce(' de la vivienda ' || v_unidad, '')
    || ' y dejó la incidencia: ' || left(btrim(p_que_paso), 140);

  insert into public.notificacion
    (usuario_id, condominio_id, tipo, titulo, mensaje, entidad_tipo, entidad_id)
  select distinct d.usuario_id, a.condominio_id, 'sos_atendido'::public.motivo_notificacion,
         'S.O.S. atendido', v_mensaje, 'alarma_sos', a.id
  from (
    select a.usuario_id
    union
    select mu.usuario_id
    from public.membresia_unidad mu
    where v_es_huesped
      and mu.unidad_id = a.unidad_id
      and mu.activo
      and mu.puede_acceder
      and mu.rol <> 'huesped_temporal'
  ) d
  where d.usuario_id is not null
    and d.usuario_id <> auth.uid()
    and public.quiere_aviso(d.usuario_id, 'sos_atendido', 'app');

  return v_id;
end;
$function$;

-- ----------------------------------------------------------------------------
-- El historial
-- ----------------------------------------------------------------------------

create or replace function public.historial_sos(p_limite integer default 50)
returns table (
  id            uuid,
  activada_en   timestamptz,
  unidad        text,
  quien         text,
  cierre        public.cierre_sos,
  cerrada_en    timestamptz,
  cerrada_por   text,
  incidencia_id uuid,
  es_mia        boolean
)
language sql
stable
security definer
set search_path = public, pg_temp
as $fn$
  select a.id, a.activada_en, u.codigo,
         nullif(btrim(coalesce(p.nombre, '') || ' ' || coalesce(p.apellido, '')), ''),
         a.cierre, a.cerrada_en,
         nullif(btrim(coalesce(pc.nombre, '') || ' ' || coalesce(pc.apellido, '')), ''),
         (select r.id from public.reclamo r where r.alarma_sos_id = a.id
          order by r.created_at limit 1),
         a.usuario_id = auth.uid()
  from public.alarma_sos a
  left join public.unidad u on u.id = a.unidad_id
  left join public.perfil p on p.id = a.usuario_id
  left join public.perfil pc on pc.id = a.cerrada_por
  where a.usuario_id = auth.uid()
     or public.es_personal_condominio(a.condominio_id)
  order by a.activada_en desc
  limit least(greatest(coalesce(p_limite, 50), 1), 200);
$fn$;

comment on function public.historial_sos(integer) is
  'Las alarmas de S.O.S. que le tocan a quien pregunta, de la más reciente a la más vieja: el personal, las de su edificio; cada quien, las suyas. Con quién la cerró y la incidencia, si la hay (hueco 15).';

revoke all on function public.historial_sos(integer) from public;
grant execute on function public.historial_sos(integer) to authenticated;
