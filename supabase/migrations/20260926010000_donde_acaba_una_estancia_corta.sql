-- Donde acaba una estancia corta y empieza una larga.
--
-- `permiso_vivienda` tiene desde el principio dos bloques de reglas --`corta_*`
-- y `larga_*`, cada uno con sus visitas, ninos, mascotas, cocheras, minimos,
-- maximos y horario de entrada-- y un interruptor `diferencia_estancia` para
-- decir si se aplican distinto.
--
-- Lo que no tiene es **la frontera**: ningun campo dice cuando una estancia es
-- corta y cuando es larga, asi que los dos bloques estaban ahi sin que nada
-- pudiera elegir entre ellos.
--
-- El cliente lo pidio con estas palabras el 25/09/2026:
--
--   "Parametro estancia corta, estancia larga. Menos de 1 mes mas limitantes.
--    Mas, ya son casi residentes."
--
-- Ese "1 mes" es justo el numero que faltaba.
--
-- Aditiva: no borra ninguna columna ni ninguna fila.

alter table public.permiso_vivienda
  add column if not exists corta_hasta_noches integer;

comment on column public.permiso_vivienda.corta_hasta_noches is
  'Hasta cuantas noches cuenta como estancia CORTA. Por encima, larga. NULL = no se ha decidido, y entonces se aplica el umbral del edificio; si tampoco lo tiene, todo es estancia corta, que es lo mas restrictivo.';

-- Coherente consigo mismo: un umbral de cero o negativo no separa nada.
alter table public.permiso_vivienda
  drop constraint if exists permiso_vivienda_umbral_positivo;
alter table public.permiso_vivienda
  add constraint permiso_vivienda_umbral_positivo
  check (corta_hasta_noches is null or corta_hasta_noches > 0);

-- ----------------------------------------------------------------------------
-- Que lado de las reglas le toca a una estancia
-- ----------------------------------------------------------------------------
-- En un solo sitio, y no en cada pantalla que lo necesite: es la clase de
-- cuenta que en este proyecto ya se ha duplicado seis veces con criterios
-- distintos.
create or replace function public.es_estancia_corta(
  p_unidad_id uuid,
  p_noches integer
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $fn$
  select case
    -- Sin noches no hay nada que clasificar; se trata como corta, que es el
    -- lado con mas limites.
    when p_noches is null or p_noches <= 0 then true
    else coalesce(
      p_noches <= (select p.corta_hasta_noches
                   from public.permisos_de_unidad(p_unidad_id) p),
      true
    )
  end;
$fn$;

comment on function public.es_estancia_corta(uuid, integer) is
  'Si una estancia de N noches cae del lado corto de las reglas de esa vivienda. Sin umbral decidido devuelve true: lo mas restrictivo, no lo mas permisivo.';

grant execute on function public.es_estancia_corta(uuid, integer) to authenticated;

-- ----------------------------------------------------------------------------
-- Y si esa estancia admite visitas
-- ----------------------------------------------------------------------------
-- `corta_permite_visitas` y `larga_permite_visitas` existian y no los leia
-- nadie. Esta funcion es la que elige el lado y responde.
create or replace function public.estancia_admite_visitas(
  p_unidad_id uuid,
  p_noches integer
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $fn$
  select coalesce(
    case
      when public.es_estancia_corta(p_unidad_id, p_noches)
        then (select p.corta_permite_visitas
              from public.permisos_de_unidad(p_unidad_id) p)
      else (select p.larga_permite_visitas
            from public.permisos_de_unidad(p_unidad_id) p)
    end,
    -- NULL = nadie lo ha decidido, y sin decidir no se prohibe. Es la misma
    -- regla que ya rige en el resto de `permiso_vivienda` y en `permitido()`
    -- de la aplicacion.
    true
  );
$fn$;

comment on function public.estancia_admite_visitas(uuid, integer) is
  'Si un huesped de N noches en esa vivienda puede registrar visitas. Combina el umbral corta/larga con la bandera del lado que le toque.';

grant execute on function public.estancia_admite_visitas(uuid, integer) to authenticated;

-- ----------------------------------------------------------------------------
-- Y `permisos_de_unidad` tiene que volver a cuadrar
-- ----------------------------------------------------------------------------
-- Esta funcion devuelve `public.permiso_vivienda` como tipo y construye la
-- fila **columna a columna**. Añadir una columna a la tabla la rompe: Postgres
-- la rechaza con "Final statement returns too few columns" y deja de
-- responder, no solo para el campo nuevo sino para todo.
--
-- Paso al aplicar esta misma migracion, y lo unico que lo delato fue que las
-- pruebas del umbral devolvian NULL. Queda dicho aqui porque volvera a pasar:
-- **cada columna nueva en `permiso_vivienda` obliga a tocar esta funcion**.
create or replace function public.permisos_de_unidad(p_unidad_id uuid)
returns public.permiso_vivienda
language sql
stable
security definer
set search_path = public, pg_temp
as $fn$
  with del_condominio as (
    select pv.*
    from public.permiso_vivienda pv
    join public.unidad u on u.condominio_id = pv.condominio_id
    where u.id = p_unidad_id and pv.unidad_id is null
    limit 1
  ),
  de_la_unidad as (
    select pv.* from public.permiso_vivienda pv
    where pv.unidad_id = p_unidad_id
    limit 1
  )
  select
    coalesce(u.id, c.id),
    coalesce(u.condominio_id, c.condominio_id),
    p_unidad_id,
    coalesce(u.entrega_directa,          c.entrega_directa),
    coalesce(u.huespedes_temporales,     c.huespedes_temporales),
    coalesce(u.diferencia_estancia,      c.diferencia_estancia),
    coalesce(u.corta_permite_visitas,    c.corta_permite_visitas),
    coalesce(u.corta_permite_ninos,      c.corta_permite_ninos),
    coalesce(u.corta_permite_mascotas,   c.corta_permite_mascotas),
    coalesce(u.corta_permite_cocheras,   c.corta_permite_cocheras),
    coalesce(u.corta_estancia_minima,    c.corta_estancia_minima),
    coalesce(u.corta_estancia_maxima,    c.corta_estancia_maxima),
    coalesce(u.corta_checkin_desde,      c.corta_checkin_desde),
    coalesce(u.corta_checkin_hasta,      c.corta_checkin_hasta),
    coalesce(u.larga_permite_visitas,    c.larga_permite_visitas),
    coalesce(u.larga_permite_ninos,      c.larga_permite_ninos),
    coalesce(u.larga_permite_mascotas,   c.larga_permite_mascotas),
    coalesce(u.larga_permite_cocheras,   c.larga_permite_cocheras),
    coalesce(u.larga_estancia_minima,    c.larga_estancia_minima),
    coalesce(u.larga_estancia_maxima,    c.larga_estancia_maxima),
    coalesce(u.larga_checkin_desde,      c.larga_checkin_desde),
    coalesce(u.larga_checkin_hasta,      c.larga_checkin_hasta),
    coalesce(u.created_at, c.created_at),
    coalesce(u.updated_at, c.updated_at),
    -- La nueva, al final: el orden tiene que ser el de las columnas de la
    -- tabla, y una columna añadida con ALTER siempre va la ultima.
    coalesce(u.corta_hasta_noches,       c.corta_hasta_noches)
  from del_condominio c
  full outer join de_la_unidad u on true;
$fn$;
