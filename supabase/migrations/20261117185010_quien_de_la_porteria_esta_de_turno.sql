-- Quién de la portería está de turno, con su cargo y su horario (17/11/2026).
--
-- Pedido aprobado por el cliente: en Mensajería, al elegir a quién escribir
-- en la portería, sale el cargo y el nombre de cada persona («Conserje ·
-- Federico Valverde»). Solo se puede escribir a quien está de turno ahora;
-- los demás salen en gris con su horario («Entra mañana 7:00»).
--
-- El horario ya existía: `turno_guardia` (la semana) y `turno_override` (el
-- ajuste de un día), y la administración ya lo carga en Seguridad. No se crea
-- otra tabla de turnos. Lo nuevo:
--
--   1. La lista `cargos_de_porteria` (Seguridad, Conserje), editable desde el
--      panel como las demás listas.
--   2. `membresia_condominio.cargo`: el código de esa lista. Vacío cuenta como
--      «Seguridad», que es lo que eran todos hasta hoy.
--   3. `turno_cubre_ahora`: si el horario de una persona cubre una hora de
--      pared del edificio. El ajuste del día manda sobre la semana, un ajuste
--      sin horas es que ese día no trabaja, y un turno que cruza la medianoche
--      sigue al día siguiente **solo** en su parte de después de medianoche
--      (`guardias_de_turno` cuenta el turno del lunes 22:00–06:00 también el
--      lunes de 00:00 a 06:00; aquí no, y no se toca aquella porque de ella
--      dependen los avisos).
--   4. `personal_de_porteria`: la lista para elegir a quién escribir. Solo
--      quien tiene el chat habilitado (los demás no leen el chat de la
--      portería), con su cargo, si está de turno, si tiene horario, su horario
--      de la semana, los ajustes de los próximos días y la hora del edificio,
--      para que la app escriba «Entra mañana 7:00» sin mirar el reloj del
--      teléfono. **Sin horario cargado cuenta como de turno**: así nadie se
--      queda sin poder escribir porque a la administración le faltó cargarlo.
--
-- Solo aditiva: una columna nueva sin valor obligatorio, una lista y dos
-- funciones nuevas.

-- 1. La lista ------------------------------------------------------------------

insert into public.catalogo_info
  (catalogo, titulo, descripcion, admite_nuevas, por_pais, riesgo, orden, conectada)
values
  ('cargos_de_porteria',
   'Cargos de la portería',
   'El cargo de cada persona de la portería. Sale delante de su nombre cuando un vecino elige a quién escribir.',
   true, false, 'bajo', 27, true)
on conflict (catalogo) do nothing;

insert into public.catalogo_opcion (catalogo, codigo, etiqueta, orden, activo, pais, extra)
values
  ('cargos_de_porteria', 'seguridad', 'Seguridad', 1, true, null, '{}'::jsonb),
  ('cargos_de_porteria', 'conserje',  'Conserje',  2, true, null, '{}'::jsonb)
on conflict (catalogo, codigo, pais) do nothing;

-- 2. El cargo de cada persona ----------------------------------------------------

alter table public.membresia_condominio
  add column if not exists cargo text default null;

comment on column public.membresia_condominio.cargo is
  'Solo para la portería: el código de la lista cargos_de_porteria (seguridad, conserje…). Vacío cuenta como seguridad. Sale delante del nombre cuando un vecino elige a quién escribir (17/11/2026).';

-- 3. Si el horario cubre una hora del edificio ----------------------------------

create or replace function public.turno_cubre_ahora(p_membresia_id uuid, p_local timestamp)
 returns boolean
 language sql
 stable security definer
 set search_path to 'public', 'pg_temp'
as $$
  with dias as (
    select p_local::date as fecha, true as es_hoy
    union all
    select p_local::date - 1, false
  ),
  efectivo as (
    -- El ajuste del día manda; sin horas no trabaja y no entra aquí.
    select di.es_hoy, o.hora_inicio, o.hora_fin
    from dias di
    join public.turno_override o
      on o.membresia_id = p_membresia_id and o.fecha = di.fecha
    where o.hora_inicio is not null and o.hora_fin is not null
    union all
    -- Sin ajuste ese día, el horario de la semana.
    select di.es_hoy, t.hora_inicio, t.hora_fin
    from dias di
    join public.turno_guardia t
      on t.membresia_id = p_membresia_id
     and t.dia_semana = extract(dow from di.fecha)::smallint
    where not exists (
      select 1 from public.turno_override o
      where o.membresia_id = p_membresia_id and o.fecha = di.fecha
    )
  )
  select exists (
    select 1 from efectivo e
    where (e.es_hoy
           and p_local::time >= e.hora_inicio
           and (e.hora_fin <= e.hora_inicio or p_local::time < e.hora_fin))
       -- La parte de después de medianoche de un turno que empezó ayer.
       or (not e.es_hoy
           and e.hora_fin <= e.hora_inicio
           and p_local::time < e.hora_fin)
  );
$$;

comment on function public.turno_cubre_ahora(uuid, timestamp) is
  'Si el horario de una membresía de portería cubre esa hora de pared del edificio: el ajuste del día manda, sin horas no trabaja, y un turno que cruza la medianoche sigue solo en su parte del día siguiente (17/11/2026).';

revoke execute on function public.turno_cubre_ahora(uuid, timestamp) from public, anon;
grant execute on function public.turno_cubre_ahora(uuid, timestamp) to authenticated, service_role;

-- 4. La lista para elegir a quién escribir --------------------------------------

create or replace function public.personal_de_porteria(p_condominio_id uuid)
 returns table(
   membresia_id   uuid,
   usuario_id     uuid,
   nombre         text,
   cargo          text,
   cargo_etiqueta text,
   de_turno       boolean,
   tiene_horario  boolean,
   turnos         jsonb,
   ajustes        jsonb,
   ahora_local    text
 )
 language sql
 stable security definer
 set search_path to 'public', 'pg_temp'
as $$
  with reloj as (
    select now() at time zone public.zona_horaria_del_condominio(p_condominio_id) as local
  ),
  personal as (
    select m.*
    from public.membresia_condominio m
    where m.condominio_id = p_condominio_id
      and m.rol = 'guardia'
      and m.activo
      and m.usuario_id is not null
      -- Solo quien lee el chat de la portería.
      and coalesce((m.permisos ->> 'chat')::boolean, false)
      -- Lo mismo que deja ver `nombres_de_guardias_de_turno`.
      and (public.es_miembro_condominio(p_condominio_id)
           or public.es_huesped_alojado_en_condominio(p_condominio_id)
           or public.es_personal_condominio(p_condominio_id))
  )
  select
    p.id,
    p.usuario_id,
    coalesce(nullif(btrim(p.nombre), ''), 'Sin nombre'),
    coalesce(nullif(btrim(p.cargo), ''), 'seguridad'),
    coalesce(
      (select o.etiqueta from public.catalogo_opcion o
       where o.catalogo = 'cargos_de_porteria'
         and o.codigo = coalesce(nullif(btrim(p.cargo), ''), 'seguridad')
       order by o.pais nulls first
       limit 1),
      initcap(coalesce(nullif(btrim(p.cargo), ''), 'seguridad'))
    ),
    (
      -- Sin ningún horario cargado cuenta como de turno.
      (not exists (select 1 from public.turno_guardia t where t.membresia_id = p.id)
       and not exists (select 1 from public.turno_override o where o.membresia_id = p.id))
      -- La prórroga aceptada que sigue corriendo, como en `guardia_atiende_ahora`.
      or exists (
        select 1 from public.prorroga_turno pr
        where pr.membresia_id = p.id and pr.estado = 'aceptada'
          and pr.hasta > now() and pr.created_at > now() - interval '1 day'
      )
      or public.turno_cubre_ahora(p.id, r.local)
    ),
    (exists (select 1 from public.turno_guardia t where t.membresia_id = p.id)
     or exists (select 1 from public.turno_override o where o.membresia_id = p.id)),
    coalesce((
      select jsonb_agg(jsonb_build_object(
               'dia', t.dia_semana,
               'inicio', to_char(t.hora_inicio, 'HH24:MI'),
               'fin', to_char(t.hora_fin, 'HH24:MI'))
             order by t.dia_semana, t.hora_inicio)
      from public.turno_guardia t
      where t.membresia_id = p.id
    ), '[]'::jsonb),
    coalesce((
      select jsonb_agg(jsonb_build_object(
               'fecha', to_char(o.fecha, 'YYYY-MM-DD'),
               'inicio', to_char(o.hora_inicio, 'HH24:MI'),
               'fin', to_char(o.hora_fin, 'HH24:MI'))
             order by o.fecha)
      from public.turno_override o
      where o.membresia_id = p.id
        and o.fecha between r.local::date - 1 and r.local::date + 8
    ), '[]'::jsonb),
    to_char(r.local, 'YYYY-MM-DD"T"HH24:MI:SS')
  from personal p
  cross join reloj r
  order by 6 desc, 3;
$$;

comment on function public.personal_de_porteria(uuid) is
  'La portería con el chat habilitado, para elegir a quién escribir: cargo, nombre, si está de turno ahora con el reloj del edificio (sin horario cargado cuenta como de turno), su horario y los ajustes de los próximos días (17/11/2026). Solo para quien es del edificio.';

revoke execute on function public.personal_de_porteria(uuid) from public, anon;
grant execute on function public.personal_de_porteria(uuid) to authenticated, service_role;
