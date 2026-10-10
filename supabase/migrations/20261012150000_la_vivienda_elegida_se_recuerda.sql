-- La vivienda que alguien elige se recuerda, y el inicio resume todas las suyas.
--
-- Aditiva: una columna y dos funciones.
--
-- Quien tiene mas de una vivienda elegia una en el selector y **la eleccion
-- duraba lo que la pestaña**: al volver a entrar, la activa era «la primera»,
-- y la primera salia de una consulta sin orden. O sea, cualquiera. El cliente
-- lo vio el 09/10/2026: entraba y estaba en una vivienda que no era en la que
-- vive.

alter table public.membresia_unidad
  add column if not exists elegida_en timestamptz;

comment on column public.membresia_unidad.elegida_en is
  'Cuando eligio esta persona esta vivienda como la activa. La mas reciente '
  'es en la que entra la proxima vez. Vacia si nunca la eligio: entonces '
  'manda la vivienda en la que reside.';

create or replace function public.elegir_unidad_activa(p_unidad_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
begin
  /*
    Sobre la membresia **propia** y viva. No recibe de quien: solo de quien
    llama. Una vivienda ajena no cambia nada y se dice.
  */
  update public.membresia_unidad
  set elegida_en = now()
  where unidad_id = p_unidad_id
    and usuario_id = auth.uid()
    and activo;

  if not found then
    raise exception 'Esa vivienda no es tuya';
  end if;
end;
$$;

comment on function public.elegir_unidad_activa(uuid) is
  'Recuerda que vivienda eligio quien llama, para abrirle esa la proxima vez.';

revoke execute on function public.elegir_unidad_activa(uuid) from public, anon;
grant execute on function public.elegir_unidad_activa(uuid) to authenticated;

-- ============================================================================
-- El resumen de mis viviendas
-- ============================================================================

create or replace function public.resumen_de_mis_viviendas()
returns table (
  unidad_id                 uuid,
  visitas_hoy               integer,
  huespedes_dentro          integer,
  correspondencia_pendiente integer,
  estancias_proximas        integer
)
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
  /*
    **Las propias, y nada mas.** Quien ademas administra el edificio tiene
    permiso para ver las de todos, y aqui no se usa: el inicio de alguien como
    vecino enseña sus viviendas, no las del edificio (regla 8). Por eso se
    parte de sus membresias de vivienda y no de lo que RLS le dejaria leer.

    El huesped temporal no entra: su estancia no es «una vivienda suya».
  */
  with mias as (
    select
      m.unidad_id,
      public.zona_horaria_del_condominio(u.condominio_id) as zona,
      (now() at time zone public.zona_horaria_del_condominio(u.condominio_id))::date as hoy
    from public.membresia_unidad m
    join public.unidad u on u.id = m.unidad_id
    where m.usuario_id = auth.uid()
      and m.activo
      and m.rol <> 'huesped_temporal'
      and (
        m.vigente_hasta is null
        or m.vigente_hasta >= (now() at time zone public.zona_horaria_del_condominio(u.condominio_id))::date
      )
  )
  select
    mi.unidad_id,
    (
      select count(*)::int
      from public.visita v
      where v.unidad_id = mi.unidad_id
        and v.deleted_at is null
        and v.estado <> 'cancelada'
        /*
          Una visita sin fecha cuenta el dia en que se registro, **con el
          reloj del edificio**. Con `created_at::date` a secas --que es UTC--
          una visita anotada a las ocho de la noche en Colombia caia en
          «mañana» y no salia en el resumen de hoy. Lo delato la prueba, que
          corrio justo a esa hora.
        */
        and coalesce(v.fecha_desde, (v.created_at at time zone mi.zona)::date) <= mi.hoy
        and coalesce(v.fecha_hasta, v.fecha_desde, (v.created_at at time zone mi.zona)::date) >= mi.hoy
    ),
    (
      select count(*)::int
      from public.invitado i
      join public.visita v on v.id = i.visita_id
      where v.unidad_id = mi.unidad_id
        and v.deleted_at is null
        and v.tipo = 'huesped_temporal'
        and i.ingreso_en is not null
        and i.salida_en is null
    ),
    (
      select count(*)::int
      from public.correspondencia c
      where c.unidad_id = mi.unidad_id
        and c.deleted_at is null
        and c.estado = 'en_porteria'
    ),
    (
      select count(*)::int
      from public.visita v
      where v.unidad_id = mi.unidad_id
        and v.deleted_at is null
        and v.tipo = 'huesped_temporal'
        and v.estado = 'programada'
        and v.fecha_desde > mi.hoy
    )
  from mias mi;
$$;

comment on function public.resumen_de_mis_viviendas() is
  'Para el inicio de quien tiene viviendas: que pasa hoy en cada una. Solo '
  'las de quien llama, aunque ademas administre el edificio.';

revoke execute on function public.resumen_de_mis_viviendas() from public, anon;
grant execute on function public.resumen_de_mis_viviendas() to authenticated;

notify pgrst, 'reload schema';
