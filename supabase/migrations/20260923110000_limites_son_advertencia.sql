-- ----------------------------------------------------------------------------
-- Los límites del edificio se advierten, no se bloquean
-- ----------------------------------------------------------------------------
-- Corrección de 20260923101000, que hice sin leer el documento de traspaso.
-- El KT lo tenía decidido, en el flujo de suscripción a renta corta:
--
--   "5. El sistema debe mostrar como **advertencia (no bloqueo duro)** las
--    reglas mínimas que ya impone el edificio/Administrador (p. ej. mínimo de
--    noches fijado por el condominio). [DECIDIDO]"
--
-- Y el paso anterior dice quién configura qué: el propietario, al suscribirse,
-- fija la estancia mínima y máxima, el aforo, si admite mascotas, menores y
-- cocheras, y el horario de entrada. El edificio pone su criterio; el
-- propietario decide su vivienda sabiéndolo.
--
-- Mi disparador hacía lo contrario: rechazaba el alta si el aforo de la
-- vivienda superaba el del condominio. Era una regla razonable y no es la que
-- se acordó, que es lo que importa.
--
-- **Lo que el KT no resuelve** y queda como pregunta para el cliente: una
-- prohibición total —`permite_renta_corta = false`— no es una "regla mínima"
-- como el mínimo de noches. Tiene peso legal: el RNT exige presentar el
-- reglamento del condominio con permiso de uso de suelo turístico. Advertir o
-- bloquear ahí es una decisión distinta y nadie la ha tomado. Mientras tanto
-- se sigue el criterio general del KT: advertir.

drop trigger if exists suscripcion_renta_corta_limites on public.suscripcion_renta_corta;
drop function if exists public.respetar_limites_renta_corta();


/**
 * Los limites del edificio que aplican a una vivienda, para que la pantalla
 * de suscripcion los muestre.
 *
 * Devuelve las reglas y ya: no juzga. Quien avisa es la interfaz, que es donde
 * el KT puso la advertencia.
 */
create or replace function public.limites_del_condominio(p_unidad_id uuid)
returns table (
  permite_renta_corta      boolean,
  estancia_minima_noches   integer,
  capacidad_maxima         integer
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select l.permite_renta_corta, l.estancia_minima_noches, l.capacidad_maxima
  from public.unidad u
  join public.limite_renta_corta_condominio l on l.condominio_id = u.condominio_id
  where u.id = p_unidad_id
    and (
      public.puede_operar_unidad(p_unidad_id)
      or public.es_miembro_condominio(u.condominio_id)
    );
$$;

comment on function public.limites_del_condominio(uuid) is
  'Las reglas de renta corta que el edificio impone, para advertir al propietario al configurar su vivienda. Advertencia, no bloqueo: decision del KT, flujo 4.1 paso 5.';


-- ----------------------------------------------------------------------------
-- Una excepción se combina con el valor del condominio, no lo reemplaza
-- ----------------------------------------------------------------------------
-- Esto sí es un defecto, y el KT no lo contradice. `permisos_de_unidad`
-- devolvía la fila de la vivienda **entera** si existía, e ignoraba la del
-- condominio. Como la tabla tiene diecinueve columnas, conceder una sola
-- excepción —autorizar la renta corta a una vivienda— hacía que las otras
-- dieciocho reglas del edificio dejaran de aplicarle.
--
-- Ya estaba pasando: la 102 tiene fila propia con `corta_estancia_maxima`
-- nula mientras el condominio dice 3. Esa vivienda no tiene estancia máxima y
-- nadie lo decidió.
--
-- Ahora cada columna cae del lado de la vivienda si tiene valor, y del
-- condominio si no.

create or replace function public.permisos_de_unidad(p_unidad_id uuid)
returns public.permiso_vivienda
language sql
stable
security definer
set search_path = public, pg_temp
as $$
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
    coalesce(u.updated_at, c.updated_at)
  from del_condominio c
  full outer join de_la_unidad u on true;
$$;

comment on function public.permisos_de_unidad(uuid) is
  'Los permisos que aplican a una vivienda: su excepcion COMBINADA con el valor del condominio, campo a campo. Antes la excepcion reemplazaba la fila entera y conceder una sola hacia caer las otras dieciocho reglas.';
