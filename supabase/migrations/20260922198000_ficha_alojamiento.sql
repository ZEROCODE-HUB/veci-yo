-- ----------------------------------------------------------------------------
-- La ficha del alojamiento, para quien se aloja
-- ----------------------------------------------------------------------------
-- "Mi alojamiento" mostraba «Esta vivienda todavía no tiene ficha de
-- alojamiento» a un huésped cuya vivienda **sí** la tenía. La ficha se arma
-- con tres tablas y el huésped no puede leer ninguna:
--
--   · `suscripcion_renta_corta` → `puede_operar_unidad`, que lo excluye;
--   · `tipologia` y `permiso_vivienda` → `es_miembro_condominio`, que también.
--
-- Abrirle las tres tablas sería lo fácil y lo equivocado: la suscripción
-- guarda el estado comercial del anfitrión —si está activa o cancelada, cuántas
-- verificaciones de antecedentes le quedan, quién se la verificó y cuándo—, y
-- nada de eso es asunto de quien pasa cuatro noches en la casa.
--
-- Se aplica el patrón que ya usan `cuadro_honor` y `unidades_renta_corta`: una
-- función que devuelve **exactamente lo que la pantalla pinta** y nada más. Si
-- el dato saliera de la base para esconderse en la pantalla, bastaría con
-- mirar la respuesta de la API.
--
-- De paso, las tres idas y vueltas del cliente se convierten en una.

create or replace function public.ficha_alojamiento(p_unidad_id uuid)
returns table (
  descripcion       text,
  num_habitaciones  integer,
  max_huespedes     integer,
  estacionamientos  integer,
  permite_mascotas  boolean,
  apto_ninos        boolean
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    coalesce(s.descripcion, ''),
    coalesce(t.habitaciones, 0),
    coalesce(s.max_huespedes, 0),
    s.estacionamientos_huesped,
    -- Los permisos tienen dos niveles: la fila con `unidad_id` nulo es el
    -- valor por defecto del condominio y la fila con unidad es la excepción
    -- de esa vivienda. Gana la excepción.
    coalesce(pv_unidad.corta_permite_mascotas, pv_defecto.corta_permite_mascotas, false),
    coalesce(pv_unidad.corta_permite_ninos,    pv_defecto.corta_permite_ninos,    false)
  from public.unidad u
  join public.suscripcion_renta_corta s on s.unidad_id = u.id
  left join public.tipologia t on t.id = u.tipologia_id
  left join public.permiso_vivienda pv_unidad
         on pv_unidad.unidad_id = u.id
  left join public.permiso_vivienda pv_defecto
         on pv_defecto.unidad_id is null
        and pv_defecto.condominio_id = u.condominio_id
  where u.id = p_unidad_id
    -- La función es `security definer`, así que comprueba ella misma quién
    -- pregunta: quien opera la vivienda, o el huésped mientras dure su
    -- estancia.
    and (
      public.puede_operar_unidad(p_unidad_id)
      or public.es_huesped_de_unidad(p_unidad_id)
    );
$$;

comment on function public.ficha_alojamiento(uuid) is
  'Ficha de la vivienda tal como la pinta "Mi alojamiento". No expone el estado comercial de la suscripcion del anfitrion. La lee quien opera la vivienda y el huesped con estancia vigente.';

revoke all on function public.ficha_alojamiento(uuid) from public;
grant execute on function public.ficha_alojamiento(uuid) to authenticated;


-- ----------------------------------------------------------------------------
-- `config_renta_corta` no la lee nadie
-- ----------------------------------------------------------------------------
-- Se creó al migrar el dominio de renta corta y quedó duplicando lo que ya
-- viven en `suscripcion_renta_corta`, `tipologia` y `permiso_vivienda`. Ningún
-- punto de la aplicación la consulta y está vacía. Se deja anotado en vez de
-- borrarla, por si el cliente tenía algo previsto para ella.
comment on table public.config_renta_corta is
  'SIN USO (22/09/2026): ningun punto de la app la lee, y lo que guarda ya vive en suscripcion_renta_corta, tipologia y permiso_vivienda. Candidata a eliminar.';
