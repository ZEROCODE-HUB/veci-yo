-- ============================================================================
-- 0015 · Quien puede ver el detalle nominal de una votacion
-- ============================================================================
-- El prototipo mostraba las listas de quien voto Si y quien voto No a cualquiera
-- que abriera el anuncio, aunque el propio anuncio tuviera activado
-- `ocultarResultados`.
--
-- En un condominio el voto nominal puede ser legitimo: las actas de asamblea
-- suelen registrarlo. Pero es una decision por votacion, y el dato ya trae el
-- flag que la expresa. Aqui ese flag manda:
--
--   ocultar_resultados = true   -> nadie ve quien voto, ni la administracion.
--                                  Solo hay conteos agregados.
--   ocultar_resultados = false  -> la administracion ve el detalle nominal,
--                                  para poder levantar el acta.
--
-- En ningun caso un vecino ve el voto de otro: la politica de `voto` sigue
-- limitando la lectura directa al voto propio. El detalle sale por esta funcion
-- o no sale.
-- ============================================================================

create or replace function public.detalle_votacion(p_publicacion_id uuid)
returns table (
  opcion      text,
  votante     text,
  unidad      text,
  emitido_en  timestamptz
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    o.etiqueta,
    coalesce(p.nombre || ' ' || p.apellido, 'Sin nombre'),
    u.codigo,
    v.emitido_en
  from public.voto v
  join public.opcion_voto o on o.id = v.opcion_id
  join public.publicacion pub on pub.id = v.publicacion_id
  left join public.perfil p on p.id = v.usuario_id
  left join public.unidad u on u.id = v.unidad_id
  where v.publicacion_id = p_publicacion_id
    and not pub.ocultar_resultados
    and public.es_admin_condominio(pub.condominio_id)
  order by o.orden, v.emitido_en;
$$;

comment on function public.detalle_votacion is
  'Detalle nominal de una votacion. Devuelve filas solo si la votacion NO es secreta y quien consulta administra el condominio; en cualquier otro caso devuelve vacio.';


-- Quienes no votaron todavia, para el seguimiento de la administracion.
create or replace function public.pendientes_votacion(p_publicacion_id uuid)
returns table (unidad text, propietario text)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select u.codigo, coalesce(p.nombre || ' ' || p.apellido, mu.nombre)
  from public.publicacion pub
  join public.unidad u on u.condominio_id = pub.condominio_id and u.deleted_at is null
  join public.membresia_unidad mu on mu.unidad_id = u.id and mu.activo
                                 and mu.rol = 'propietario'
  left join public.perfil p on p.id = mu.usuario_id
  where pub.id = p_publicacion_id
    and public.es_admin_condominio(pub.condominio_id)
    and not exists (
      select 1 from public.voto v
      where v.publicacion_id = pub.id and v.usuario_id = mu.usuario_id
    )
  order by u.codigo;
$$;
