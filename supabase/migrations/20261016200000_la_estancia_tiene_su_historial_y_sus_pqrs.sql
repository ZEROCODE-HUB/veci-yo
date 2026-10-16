-- ============================================================================
-- La estancia tiene su historial, y una PQRS puede ser de una estancia
-- ============================================================================
-- La responsable de producto (16/10/2026):
--   «PQRS: puede registrarlo desde pantalla seleccionando departamento, o desde
--   la misma reserva del huésped. Si entró visitas, si entró un rappi, si
--   reservó una piscina, si sacó un televisor… Por alojamiento, todo el
--   historial. Mostrar al anfitrión en los detalles de reserva.»
--
-- Dos piezas:
--   1. `reclamo.visita_id`: la PQRS que nace desde una reserva queda atada a
--      ella. Nula en todas las demás, como hasta hoy.
--   2. `historial_de_la_estancia`: lo que pasó en la vivienda mientras duró la
--      estancia, junto y en orden. Lee de tablas que ya existen; no guarda
--      nada. «Sacó un televisor» no tiene tabla: hoy se anota como PQRS desde
--      la reserva (REVISAR-A-OJO).
--
-- No se borra nada.

alter table public.reclamo
  add column if not exists visita_id uuid references public.visita(id) on delete set null;

create index if not exists reclamo_visita_idx on public.reclamo (visita_id)
  where visita_id is not null;

comment on column public.reclamo.visita_id is
  'La estancia de huesped de la que nace esta PQRS, si nacio desde una reserva (16/10/2026).';


create or replace function public.historial_de_la_estancia(p_visita_id uuid)
returns table (
  momento timestamptz,
  tipo    text,
  titulo  text,
  detalle text
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
-- Las columnas que devuelve (`tipo`, `titulo`…) se llaman igual que columnas
-- de las tablas: sin esto, plpgsql no sabe cuál es cuál.
#variable_conflict use_column
declare
  v public.visita%rowtype;
  v_hasta date;
  v_usuarios uuid[];
begin
  select * into v from public.visita
   where id = p_visita_id and deleted_at is null and tipo = 'huesped_temporal';
  if v.id is null then
    return;
  end if;

  -- El anfitrión y quien gestiona la vivienda; la administración y la portería
  -- del edificio. El huésped no.
  if not (
    public.puede_configurar_alojamiento(v.unidad_id)
    or exists (
      select 1 from public.membresia_unidad mu
      where mu.unidad_id = v.unidad_id and mu.usuario_id = auth.uid()
        and mu.activo and mu.rol <> 'huesped_temporal'
    )
    or public.es_admin_condominio(v.condominio_id)
    or public.es_personal_condominio(v.condominio_id)
  ) then
    raise exception 'No puedes ver el historial de esta estancia' using errcode = '42501';
  end if;

  v_hasta := coalesce(v.fecha_hasta, v.fecha_desde);
  select coalesce(array_agg(i.usuario_id) filter (where i.usuario_id is not null), '{}')
    into v_usuarios
  from public.invitado i where i.visita_id = v.id;

  return query
  -- Entradas y salidas de los propios huéspedes.
  select i.ingreso_en, 'entrada'::text, i.nombre || ' entró', null::text
    from public.invitado i where i.visita_id = v.id and i.ingreso_en is not null
  union all
  select i.salida_en, 'salida', i.nombre || ' salió', null
    from public.invitado i where i.visita_id = v.id and i.salida_en is not null
  -- Visitas a la vivienda mientras duró la estancia (amigos, domicilios…).
  union all
  select coalesce(iv.ingreso_en, ov.created_at), 'visita',
         coalesce(iv.nombre, 'Visita') || ' · ' || ov.tipo::text,
         case when iv.ingreso_en is not null then 'Entró' else 'Anunciada' end
    from public.visita ov
    join public.invitado iv on iv.visita_id = ov.id
   where ov.unidad_id = v.unidad_id
     and ov.id <> v.id
     and ov.deleted_at is null
     and ov.tipo <> 'huesped_temporal'
     and coalesce(ov.fecha_desde, ov.created_at::date) between v.fecha_desde and v_hasta
  -- Correspondencia y domicilios que llegaron a la vivienda.
  union all
  select c.registrada_en, 'correspondencia',
         coalesce(nullif(c.empresa, ''), nullif(c.logistica, ''), 'Paquete'),
         c.descripcion
    from public.correspondencia c
   where c.unidad_id = v.unidad_id
     and c.deleted_at is null
     and (c.registrada_en at time zone public.zona_horaria_del_condominio(v.condominio_id))::date
         between v.fecha_desde and v_hasta
  -- Zonas comunes que reservaron los huéspedes.
  union all
  select (r.fecha + r.hora_inicio)::timestamp at time zone public.zona_horaria_del_condominio(v.condominio_id),
         'zona', z.nombre,
         to_char(r.hora_inicio, 'HH24:MI') || '–' || to_char(r.hora_fin, 'HH24:MI') || ' · ' || r.estado::text
    from public.reserva_zona r
    join public.zona_comun z on z.id = r.zona_id
   where r.unidad_id = v.unidad_id
     and r.solicitada_por = any (v_usuarios)
     and r.fecha between v.fecha_desde and v_hasta
  -- PQRS de la estancia, o contra la vivienda en esas fechas.
  union all
  select q.created_at, 'pqrs', q.numero || ' · ' || q.titulo, q.estado::text
    from public.reclamo q
   where q.visita_id = v.id
      or (q.unidad_denunciada = v.unidad_id
          and (q.created_at at time zone public.zona_horaria_del_condominio(v.condominio_id))::date
              between v.fecha_desde and v_hasta)
  order by 1;
end;
$$;

comment on function public.historial_de_la_estancia(uuid) is
  'Lo que paso en la vivienda mientras duro una estancia de huesped: entradas, '
  'visitas, correspondencia, zonas y PQRS. Para el anfitrion y el personal.';

revoke all on function public.historial_de_la_estancia(uuid) from public;
grant execute on function public.historial_de_la_estancia(uuid) to authenticated;
