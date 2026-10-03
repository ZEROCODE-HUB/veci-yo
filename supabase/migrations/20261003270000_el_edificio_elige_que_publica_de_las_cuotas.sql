-- ----------------------------------------------------------------------------
-- El edificio elige qué publica de las cuotas
-- ----------------------------------------------------------------------------
-- Pedido por el cliente el 02/10/2026: que el porcentaje de cuotas sea
-- parametrizable --quien pago / quien no / solo el porcentaje-- y que muestre
-- el mes en curso.
--
-- Hoy no hay eleccion posible y estan las dos puntas:
--
--   · `resumen_cuotas` da el agregado --cuanto se esperaba, cuanto entro, y
--     cuantas unidades al dia-- a **cualquier miembro del condominio**;
--   · `cuadro_honor` da los nombres de quienes **si** pagaron, tambien a
--     cualquiera. Su comentario lo dice: «no expone morosidad».
--
-- Lo que falta es lo del medio y lo de mas alla, y sobre todo que lo decida
-- quien responde por el edificio. Publicar quien debe no es una opcion tecnica:
-- en un edificio pequeño es señalar a un vecino por su nombre en la puerta, y
-- hay administraciones que lo hacen y otras que no quieren ni oirlo.
--
-- ----------------------------------------------------------------------------
-- El mes en curso
-- ----------------------------------------------------------------------------
-- `resumen_cuotas` recorre `cuota_administracion`, asi que un mes sin cuota
-- creada **no existe**: el carrusel salta de agosto a junio y nadie sabe si es
-- que todos pagaron o que nadie definio la cuota. Ahora el mes actual sale
-- siempre, y si no tiene cuota se ve en cero con su bandera.
--
-- Aditiva: un enum, una columna con valor por defecto igual a lo de hoy, y una
-- funcion nueva. `resumen_cuotas` cambia lo que devuelve --una columna mas y
-- una fila mas-- y eso se dice en el commit.

do $$
begin
  if not exists (select 1 from pg_type where typname = 'visibilidad_cuotas') then
    create type public.visibilidad_cuotas as enum (
      'porcentaje',   -- solo el agregado: cuanto se recaudo. Lo de hoy.
      'quien_pago',   -- ademas, los nombres de quienes estan al dia.
      'quien_debe'    -- ademas, quienes no. Lo mas delicado, y por eso se elige.
    );
  end if;
end
$$;

comment on type public.visibilidad_cuotas is
  'Que se publica del estado de las cuotas a los vecinos. Lo decide la administracion: enseñar quien debe es señalar a alguien por su nombre, y no todos los edificios lo quieren.';

alter table public.condominio
  add column if not exists cuotas_visibilidad public.visibilidad_cuotas
    not null default 'porcentaje';

comment on column public.condominio.cuotas_visibilidad is
  'Lo que los vecinos ven de las cuotas. Por defecto solo el porcentaje, que es lo que habia antes de poder elegir.';

-- 1. El resumen, con el mes en curso --------------------------------------

drop function if exists public.resumen_cuotas(uuid);

create function public.resumen_cuotas(p_condominio_id uuid)
returns table (
  periodo     date,
  moneda      char(3),
  esperado    numeric(12,2),
  recibido    numeric(12,2),
  al_dia      int,
  atrasados   int,
  /*
    Si ese mes tiene cuota definida. El mes en curso sale aunque no la tenga
    --para que se vea que falta-- y sin esta bandera un «0%» de un mes sin
    cuota se lee como «no ha pagado nadie», que es una acusacion falsa.
  */
  tiene_cuota boolean
)
language sql
stable
security definer
set search_path = public
as $$
  with definidos as (
    select
      c.periodo,
      c.moneda,
      (c.monto * count(u.id))::numeric(12,2) as esperado,
      (c.monto * count(*) filter (where p.pagado))::numeric(12,2) as recibido,
      count(*) filter (where p.pagado)::int as al_dia,
      count(*) filter (where p.pagado is not true)::int as atrasados,
      true as tiene_cuota
    from public.cuota_administracion c
    join public.unidad u
      on u.condominio_id = c.condominio_id and u.deleted_at is null
    left join public.pago_cuota p
      on p.cuota_id = c.id and p.unidad_id = u.id
    where c.condominio_id = p_condominio_id
    group by c.id, c.periodo, c.moneda, c.monto
  ),
  /*
    El mes en curso, si nadie le puso cuota. `date_trunc` sobre `current_date`
    es inmune al huso --es una fecha, no un instante-- asi que aqui no hace
    falta anclar nada.
  */
  en_curso as (
    select
      date_trunc('month', current_date)::date as periodo,
      null::char(3) as moneda,
      0::numeric(12,2) as esperado,
      0::numeric(12,2) as recibido,
      0 as al_dia,
      (select count(*)::int from public.unidad u
       where u.condominio_id = p_condominio_id and u.deleted_at is null) as atrasados,
      false as tiene_cuota
    where not exists (
      select 1 from definidos d
      where d.periodo = date_trunc('month', current_date)::date
    )
  )
  select * from (
    select * from definidos
    union all
    select * from en_curso
  ) todo
  where public.es_miembro_condominio(p_condominio_id)
  order by periodo desc
  limit 12;
$$;

comment on function public.resumen_cuotas(uuid) is
  'Recaudacion agregada por periodo, con el mes en curso siempre presente. No expone que unidad pago: para eso esta `detalle_cuotas`, que obedece a lo que el edificio haya elegido publicar.';

revoke all on function public.resumen_cuotas(uuid) from public;
grant execute on function public.resumen_cuotas(uuid) to authenticated;

-- 2. El detalle, hasta donde el edificio quiera ------------------------------

create or replace function public.detalle_cuotas(
  p_condominio_id uuid,
  p_periodo date default null
)
returns table (
  unidad_id   uuid,
  codigo      text,
  torre       int,
  responsable text,
  pagado      boolean
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $fn$
declare
  v_visible public.visibilidad_cuotas;
  v_admin   boolean;
  v_periodo date;
begin
  if not public.es_miembro_condominio(p_condominio_id) then
    return;
  end if;

  select cuotas_visibilidad into v_visible
  from public.condominio where id = p_condominio_id;

  v_admin := public.es_admin_condominio(p_condominio_id);

  /*
    La administracion ve todo siempre: es quien cobra, y ocultarselo seria
    quitarle la herramienta en vez de proteger a nadie. Lo que se decide con
    `cuotas_visibilidad` es que ven **los demas**.
  */
  if not v_admin and v_visible = 'porcentaje' then
    return;
  end if;

  /*
    Sin periodo pedido, **el ultimo que tenga cuota** --y no el mes en curso--.

    El mes corriente casi nunca la tiene todavia: la administracion la define a
    mitad de mes. Con el mes en curso por defecto, esta funcion devolvia una
    lista vacia que se lee como «nadie ha pagado» o como «la opcion no
    funciona», cuando lo que pasa es que no hay nada que cobrar aun. Salio en
    el recorrido, en el caso de «quien pago».
  */
  select c.periodo into v_periodo
  from public.cuota_administracion c
  where c.condominio_id = p_condominio_id
  order by c.periodo desc
  limit 1;

  v_periodo := coalesce(p_periodo, v_periodo, date_trunc('month', current_date)::date);

  return query
  with responsables as (
    select distinct on (m.unidad_id) m.unidad_id, m.nombre
    from public.membresia_unidad m
    where m.activo and m.rol in ('propietario', 'inquilino_lider')
    order by m.unidad_id, (m.rol = 'propietario') desc, m.created_at
  )
  select
    u.id,
    u.codigo,
    t.numero,
    r.nombre,
    coalesce(pc.pagado, false)
  from public.unidad u
  join public.torre t on t.id = u.torre_id
  left join responsables r on r.unidad_id = u.id
  left join public.cuota_administracion c
    on c.condominio_id = u.condominio_id and c.periodo = v_periodo
  left join public.pago_cuota pc
    on pc.cuota_id = c.id and pc.unidad_id = u.id
  where u.condominio_id = p_condominio_id
    and u.deleted_at is null
    -- Y aqui se aplica lo elegido: con `quien_pago` solo salen los que estan
    -- al dia; los morosos no aparecen ni en blanco, que tambien los señalaria.
    and (
      v_admin
      or v_visible = 'quien_debe'
      or (v_visible = 'quien_pago' and coalesce(pc.pagado, false))
    )
  order by t.numero, u.codigo;
end;
$fn$;

comment on function public.detalle_cuotas is
  'Quien pago y quien no, hasta donde el edificio haya decidido publicar. La administracion lo ve entero siempre: es quien cobra.';

revoke all on function public.detalle_cuotas(uuid, date) from public;
grant execute on function public.detalle_cuotas(uuid, date) to authenticated;

-- 3. Y quien lo decide -------------------------------------------------------

create or replace function public.guardar_visibilidad_cuotas(
  p_condominio_id uuid,
  p_visibilidad public.visibilidad_cuotas
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
begin
  if not public.es_admin_condominio(p_condominio_id) then
    raise exception 'Solo la administracion decide que se publica de las cuotas';
  end if;

  update public.condominio
  set cuotas_visibilidad = p_visibilidad
  where id = p_condominio_id;
end;
$fn$;

comment on function public.guardar_visibilidad_cuotas is
  'Cambia que ven los vecinos del estado de las cuotas. Va en funcion y no por la tabla porque `condominio` no deja escribir a cualquiera, y con razon.';

revoke all on function public.guardar_visibilidad_cuotas(uuid, public.visibilidad_cuotas) from public;
grant execute on function public.guardar_visibilidad_cuotas(uuid, public.visibilidad_cuotas) to authenticated;
