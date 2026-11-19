-- ============================================================================
-- Zonas comunes: límites, nombres, plazos y bitácora (18/11/2026, pedido del
-- cliente)
-- ============================================================================
-- Lo que la administración parametriza en cada zona:
--   · `personas_por_reserva`: cuántas personas caben en UNA reserva (la
--     capacidad máxima es la de la zona entera).
--   · `reservas_activas_maximas` y `limite_reservas_por`: cuántas reservas
--     por delante puede tener cada vivienda (o cada persona) en esa zona.
--     Vacío = sin límite (las zonas que ya existen). La pantalla propone 1.
--   · `anticipacion_minima_horas`: con cuánto tiempo hay que reservar.
--   · `plazo_adjunto_horas`: cuánto tiempo hay para adjuntar el comprobante
--     en una zona con costo; pasado, la reserva se cancela y se avisa.
--   · `zona_recurso`: el nombre de cada una de las zonas iguales («Parrilla
--     Terraza», «Parrilla 2»), por su número.
-- Y lo que hace la base sola:
--   · cancela las reservas vencidas (sin adjunto a tiempo, o sin respuesta
--     de la administración cuando ya empieza) y avisa a la vivienda;
--   · la bitácora de cada reserva (`reserva_zona_accion`): quién hizo qué.
--   · el aviso a la administración dice «Reserva por aprobar» y cuánto falta.
--
-- Solo aditiva.

-- ─── 1. Lo que se parametriza ──────────────────────────────────────────────

do $$ begin
  create type public.limite_reservas_por as enum ('vivienda', 'persona');
exception when duplicate_object then null; end $$;

alter table public.zona_comun
  add column if not exists personas_por_reserva integer,
  add column if not exists reservas_activas_maximas integer,
  add column if not exists limite_reservas_por public.limite_reservas_por not null default 'vivienda',
  add column if not exists anticipacion_minima_horas integer not null default 0,
  add column if not exists plazo_adjunto_horas integer;

alter table public.zona_comun drop constraint if exists zona_personas_por_reserva_positivo;
alter table public.zona_comun add constraint zona_personas_por_reserva_positivo
  check (personas_por_reserva is null or personas_por_reserva >= 1);
alter table public.zona_comun drop constraint if exists zona_reservas_activas_positivo;
alter table public.zona_comun add constraint zona_reservas_activas_positivo
  check (reservas_activas_maximas is null or reservas_activas_maximas >= 1);
alter table public.zona_comun drop constraint if exists zona_anticipacion_no_negativa;
alter table public.zona_comun add constraint zona_anticipacion_no_negativa
  check (anticipacion_minima_horas >= 0);
alter table public.zona_comun drop constraint if exists zona_plazo_adjunto_positivo;
alter table public.zona_comun add constraint zona_plazo_adjunto_positivo
  check (plazo_adjunto_horas is null or plazo_adjunto_horas >= 1);

comment on column public.zona_comun.personas_por_reserva is 'Cuántas personas caben en una reserva, contando a quien reserva (18/11/2026). Vacío: lo que deje la capacidad de la zona.';
comment on column public.zona_comun.reservas_activas_maximas is 'Cuántas reservas por delante puede tener cada vivienda o persona en esta zona (18/11/2026). Vacío: sin límite.';
comment on column public.zona_comun.limite_reservas_por is 'Si el límite de reservas cuenta por vivienda o por persona (18/11/2026).';
comment on column public.zona_comun.anticipacion_minima_horas is 'Con cuántas horas de anticipación hay que reservar (18/11/2026). 0: al momento.';
comment on column public.zona_comun.plazo_adjunto_horas is 'En una zona con costo, cuántas horas hay para adjuntar el comprobante tras reservar; pasado, se cancela (18/11/2026). Vacío: sin plazo.';

insert into public.configuracion_plataforma
  (clave, valor, valor_por_defecto, tipo, unidad, minimo, maximo, ambito, categoria, riesgo, es_publico, valores_permitidos, descripcion)
values
  ('zona_reservas_activas_por_defecto', '1', '1', 'entero', 'reservas', 1, 50, 'edificio', 'zonas', 'bajo', true, null,
   'Cuántas reservas por delante propone la pantalla al crear una zona común.'),
  ('zona_plazo_adjunto_por_defecto', '24', '24', 'entero', 'horas', 1, 168, 'edificio', 'zonas', 'bajo', true, null,
   'Horas que propone la pantalla para adjuntar el comprobante al crear una zona con costo.')
on conflict (clave) do nothing;

-- ─── 2. El nombre de cada una de las zonas iguales ─────────────────────────

create table if not exists public.zona_recurso (
  id uuid primary key default gen_random_uuid(),
  zona_id uuid not null references public.zona_comun(id) on delete cascade,
  numero integer not null,
  nombre text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint zona_recurso_numero_positivo check (numero >= 1),
  constraint zona_recurso_nombre_no_vacio check (btrim(nombre) <> ''),
  constraint zona_recurso_uno_por_numero unique (zona_id, numero)
);
comment on table public.zona_recurso is
  'El nombre de cada una de las zonas iguales de una zona común («Parrilla Terraza»), por su número (`reserva_zona.numero_recurso`). Sin fila, se llama «<zona> N°<número>» (18/11/2026).';

drop trigger if exists zona_recurso_tocar_updated_at on public.zona_recurso;
create trigger zona_recurso_tocar_updated_at before update on public.zona_recurso
  for each row execute function public.tocar_updated_at();

alter table public.zona_recurso enable row level security;

drop policy if exists zona_recurso_lectura on public.zona_recurso;
create policy zona_recurso_lectura on public.zona_recurso for select to authenticated
  using (exists (select 1 from public.zona_comun z
                 where z.id = zona_recurso.zona_id
                   and (public.es_miembro_condominio(z.condominio_id)
                        or public.es_administrador_de(z.condominio_id))));

drop policy if exists zona_recurso_escritura on public.zona_recurso;
create policy zona_recurso_escritura on public.zona_recurso for all to authenticated
  using (exists (select 1 from public.zona_comun z
                 where z.id = zona_recurso.zona_id and public.es_admin_condominio(z.condominio_id)))
  with check (exists (select 1 from public.zona_comun z
                      where z.id = zona_recurso.zona_id and public.es_admin_condominio(z.condominio_id)));

-- ─── 3. Los límites, al reservar ───────────────────────────────────────────

/*
  Una reserva «por delante»: no cancelada, rechazada ni terminada, y de hoy en
  adelante.
*/
create or replace function public.reserva_por_delante(p_estado public.estado_reserva, p_fecha date, p_condominio uuid)
returns boolean
language sql
stable
set search_path to 'public', 'pg_temp'
as $$
  select p_estado in ('pendiente', 'aprobada', 'en_curso')
     and p_fecha >= public.hoy_en_el_condominio(p_condominio);
$$;

create or replace function public.respetar_limites_de_la_zona()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_z public.zona_comun%rowtype;
  v_cuantas integer;
  v_inicio timestamptz;
begin
  select * into v_z from public.zona_comun where id = new.zona_id;
  if v_z.id is null then
    return new;
  end if;
  -- La portería y la administración registran lo que haga falta.
  if auth.uid() is null or public.es_personal_condominio(v_z.condominio_id) then
    return new;
  end if;

  -- Personas por reserva (contando a quien reserva).
  if v_z.personas_por_reserva is not null
     and 1 + coalesce(new.acompanantes, 0) > v_z.personas_por_reserva then
    raise exception 'En una reserva de % caben como máximo % personas, contando a quien reserva.',
      v_z.nombre, v_z.personas_por_reserva
      using errcode = 'check_violation';
  end if;

  if tg_op = 'INSERT' then
    -- Con cuánta anticipación.
    if v_z.anticipacion_minima_horas > 0 then
      v_inicio := (new.fecha + new.hora_inicio) at time zone public.zona_horaria_del_condominio(v_z.condominio_id);
      if v_inicio < now() + make_interval(hours => v_z.anticipacion_minima_horas) then
        raise exception '% se reserva con al menos % horas de anticipación.',
          v_z.nombre, v_z.anticipacion_minima_horas
          using errcode = 'check_violation';
      end if;
    end if;

    -- Cuántas por delante.
    if v_z.reservas_activas_maximas is not null then
      select count(*) into v_cuantas
        from public.reserva_zona r
       where r.zona_id = new.zona_id
         and public.reserva_por_delante(r.estado, r.fecha, v_z.condominio_id)
         and case when v_z.limite_reservas_por = 'persona'
                  then r.solicitada_por = coalesce(new.solicitada_por, auth.uid())
                  else r.unidad_id = new.unidad_id end;
      if v_cuantas >= v_z.reservas_activas_maximas then
        raise exception 'Ya tienes % reserva(s) por delante en %, que es el máximo%. Puedes editar la que tienes.',
          v_cuantas, v_z.nombre,
          case when v_z.limite_reservas_por = 'persona' then ' por persona' else ' por vivienda' end
          using errcode = 'check_violation';
      end if;
    end if;
  end if;

  return new;
end;
$$;
revoke execute on function public.respetar_limites_de_la_zona() from public, anon, authenticated;

drop trigger if exists reserva_zona_limites_de_la_zona on public.reserva_zona;
create trigger reserva_zona_limites_de_la_zona
  before insert or update of acompanantes on public.reserva_zona
  for each row execute function public.respetar_limites_de_la_zona();

-- ─── 4. La bitácora de cada reserva ────────────────────────────────────────

do $$ begin
  create type public.accion_sobre_reserva as enum ('creada', 'editada', 'aprobada', 'rechazada', 'cancelada', 'adjunto', 'terminada');
exception when duplicate_object then null; end $$;

create table if not exists public.reserva_zona_accion (
  id uuid primary key default gen_random_uuid(),
  reserva_id uuid not null references public.reserva_zona(id) on delete cascade,
  accion public.accion_sobre_reserva not null,
  hecha_por uuid references auth.users(id) on delete set null,
  antes jsonb,
  despues jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.reserva_zona_accion is
  'Quién hizo qué en cada reserva de zona común (18/11/2026): crearla, editarla, aprobarla, cancelarla, adjuntar. La escribe un disparador; la leen quienes ven la reserva.';
create index if not exists reserva_zona_accion_por_reserva on public.reserva_zona_accion (reserva_id, created_at);

alter table public.reserva_zona_accion enable row level security;
drop policy if exists reserva_zona_accion_lectura on public.reserva_zona_accion;
create policy reserva_zona_accion_lectura on public.reserva_zona_accion for select to authenticated
  using (public.puede_ver_reserva(reserva_id));

create or replace function public.anotar_accion_de_reserva()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_accion public.accion_sobre_reserva;
  v_lo_que jsonb := '{}'::jsonb;
  v_antes jsonb;
begin
  if tg_op = 'INSERT' then
    insert into public.reserva_zona_accion (reserva_id, accion, hecha_por, despues)
    values (new.id, 'creada', auth.uid(),
            jsonb_build_object('fecha', new.fecha, 'hora_inicio', new.hora_inicio, 'hora_fin', new.hora_fin,
                               'acompanantes', new.acompanantes, 'numero_recurso', new.numero_recurso));
    return new;
  end if;

  if new.estado is distinct from old.estado then
    v_accion := case new.estado
      when 'aprobada' then 'aprobada'
      when 'rechazada' then 'rechazada'
      when 'cancelada' then 'cancelada'
      when 'finalizada' then 'terminada'
      else 'editada' end;
  elsif new.comprobante_path is distinct from old.comprobante_path and new.comprobante_path is not null then
    v_accion := 'adjunto';
  elsif new.fecha is distinct from old.fecha or new.hora_inicio is distinct from old.hora_inicio
        or new.hora_fin is distinct from old.hora_fin or new.acompanantes is distinct from old.acompanantes
        or new.numero_recurso is distinct from old.numero_recurso then
    v_accion := 'editada';
  else
    return new;
  end if;

  v_antes := jsonb_build_object('estado', old.estado, 'fecha', old.fecha, 'hora_inicio', old.hora_inicio,
                                'hora_fin', old.hora_fin, 'acompanantes', old.acompanantes,
                                'numero_recurso', old.numero_recurso);
  v_lo_que := jsonb_build_object('estado', new.estado, 'fecha', new.fecha, 'hora_inicio', new.hora_inicio,
                                 'hora_fin', new.hora_fin, 'acompanantes', new.acompanantes,
                                 'numero_recurso', new.numero_recurso);
  insert into public.reserva_zona_accion (reserva_id, accion, hecha_por, antes, despues)
  values (new.id, v_accion, auth.uid(), v_antes, v_lo_que);
  return new;
end;
$$;
revoke execute on function public.anotar_accion_de_reserva() from public, anon, authenticated;

drop trigger if exists reserva_zona_bitacora on public.reserva_zona;
create trigger reserva_zona_bitacora
  after insert or update on public.reserva_zona
  for each row execute function public.anotar_accion_de_reserva();

-- ─── 5. El aviso a la administración ───────────────────────────────────────

/*
  «Reserva por aprobar», también cuando llega el adjunto («editada con
  documento adjunto»; no siempre es un comprobante de pago), y cuánto falta
  para que empiece: es el plazo que tiene la administración.
*/
CREATE OR REPLACE FUNCTION public.avisar_reserva_por_aprobar()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_zona        text;
  v_condominio  uuid;
  v_vivienda    text;
  v_titulo      text;
  v_mensaje     text;
  v_faltan      interval;
  v_falta_txt   text;
begin
  if new.estado <> 'pendiente' then
    return new;
  end if;

  if tg_op = 'INSERT' then
    v_titulo := 'Reserva por aprobar';
  elsif new.comprobante_path is not null
        and new.comprobante_path is distinct from old.comprobante_path then
    v_titulo := 'Reserva por aprobar · con documento adjunto';
  else
    return new;
  end if;

  select z.nombre, z.condominio_id into v_zona, v_condominio
  from public.zona_comun z where z.id = new.zona_id;
  select u.codigo into v_vivienda from public.unidad u where u.id = new.unidad_id;

  v_faltan := ((new.fecha + new.hora_inicio) at time zone public.zona_horaria_del_condominio(v_condominio)) - now();
  v_falta_txt := case
    when v_faltan <= interval '0' then 'ya empezó'
    when v_faltan < interval '1 hour' then 'falta menos de 1 h para aprobarla'
    when v_faltan < interval '48 hours' then 'faltan ' || floor(extract(epoch from v_faltan) / 3600)::int || ' h para aprobarla'
    else 'faltan ' || floor(extract(epoch from v_faltan) / 86400)::int || ' días para aprobarla' end;

  v_mensaje := coalesce(v_zona, 'Una zona común')
    || ' · ' || to_char(new.fecha, 'DD/MM/YYYY')
    || ' ' || to_char(new.hora_inicio, 'HH24:MI')
    || coalesce(' · vivienda ' || v_vivienda, '')
    || ' · ' || v_falta_txt || '.';

  insert into public.notificacion
    (usuario_id, condominio_id, tipo, titulo, mensaje, entidad_tipo, entidad_id)
  select distinct mc.usuario_id, v_condominio, 'reserva_por_aprobar'::public.motivo_notificacion,
         v_titulo, v_mensaje, 'reserva_zona', new.id
  from public.membresia_condominio mc
  where mc.condominio_id = v_condominio
    and mc.activo
    and mc.usuario_id is not null
    and mc.usuario_id is distinct from auth.uid()
    and (
      mc.rol = 'administrador'
      or (mc.rol = 'coadministrador'
          and coalesce((mc.permisos ->> 'visualizarZonasComunes')::boolean, true))
    )
    and public.quiere_aviso(mc.usuario_id, 'reserva_por_aprobar', 'app');

  return new;
end;
$function$;

-- ─── 6. Cancelar lo vencido ────────────────────────────────────────────────

/*
  A quién cancelar, separado de cancelar (como el recordatorio del
  preregistro): se puede mirar sin tocar nada.
    · `sin_adjunto`: zona con costo y plazo, pendiente, sin comprobante, y el
      plazo desde que se reservó ya pasó.
    · `sin_respuesta`: pendiente y ya es la hora de empezar.
*/
create or replace function public.reservas_por_cancelar()
returns table (reserva_id uuid, motivo text)
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
  select r.id,
         case when z.plazo_adjunto_horas is not null
                   and (z.costo_reserva > 0 or z.monto_garantia > 0)
                   and r.comprobante_path is null
                   and r.created_at + make_interval(hours => z.plazo_adjunto_horas) <= now()
              then 'sin_adjunto' else 'sin_respuesta' end
    from public.reserva_zona r
    join public.zona_comun z on z.id = r.zona_id
   where r.estado = 'pendiente'
     and (
       (z.plazo_adjunto_horas is not null
        and (z.costo_reserva > 0 or z.monto_garantia > 0)
        and r.comprobante_path is null
        and r.created_at + make_interval(hours => z.plazo_adjunto_horas) <= now())
       or ((r.fecha + r.hora_inicio) at time zone public.zona_horaria_del_condominio(z.condominio_id)) <= now()
     );
$$;
revoke execute on function public.reservas_por_cancelar() from public, anon, authenticated;
grant execute on function public.reservas_por_cancelar() to service_role;

create or replace function public.cancelar_reservas_vencidas()
returns integer
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v record;
  v_cuantas integer := 0;
  v_zona text;
begin
  for v in select * from public.reservas_por_cancelar() loop
    update public.reserva_zona
       set estado = 'cancelada',
           motivo_rechazo = case v.motivo
             when 'sin_adjunto' then 'Se canceló sola: no llegó el comprobante a tiempo.'
             else 'Se canceló sola: la administración no la aprobó a tiempo.' end,
           resuelta_en = now()
     where id = v.reserva_id and estado = 'pendiente';
    if found then
      v_cuantas := v_cuantas + 1;
      select z.nombre into v_zona from public.reserva_zona r join public.zona_comun z on z.id = r.zona_id where r.id = v.reserva_id;
      perform public.notificar_unidad(
        (select unidad_id from public.reserva_zona where id = v.reserva_id),
        'reserva_cancelada',
        'Tu reserva no se confirmó',
        case v.motivo
          when 'sin_adjunto' then 'La reserva de ' || coalesce(v_zona, 'la zona común') || ' se canceló porque no se adjuntó el comprobante a tiempo. Puedes hacer una nueva reserva.'
          else 'Tu reserva de ' || coalesce(v_zona, 'la zona común') || ' no fue aprobada: la administración no respondió a tiempo. Te sugerimos hacer una nueva reserva y contactar a la administración.' end,
        'reserva_zona', v.reserva_id);
    end if;
  end loop;
  return v_cuantas;
end;
$$;
revoke execute on function public.cancelar_reservas_vencidas() from public, anon, authenticated;
grant execute on function public.cancelar_reservas_vencidas() to service_role;

-- La tarea programada (cada 15 minutos) se enciende al publicar, en su
-- propia migración: en la base hay reservas pendientes de antes de hoy que se
-- cancelarían de golpe, y eso se decide con el cliente.
