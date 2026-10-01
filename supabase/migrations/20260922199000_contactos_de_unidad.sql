-- ----------------------------------------------------------------------------
-- A quién llamar desde la vivienda donde uno se aloja
-- ----------------------------------------------------------------------------
-- La pantalla de reglamentos termina en un bloque "Información del
-- departamento" con tres contactos. Estaban escritos a mano —María Pérez,
-- Carlos Gómez y Juan López— y eran los mismos para cualquier vivienda de
-- cualquier condominio. Es el mismo defecto que ya se corrigió en el
-- directorio (R-30): un huésped con un problema a medianoche llamaría a tres
-- personas que no existen.
--
-- El directorio lo resolvió leyendo `membresia_unidad`, pero eso no sirve
-- aquí: el huésped solo ve su propia fila de esa tabla, y es justamente quien
-- más necesita estos tres teléfonos.
--
-- Se expone como función acotada, el patrón que ya usan `cuadro_honor` y
-- `ficha_alojamiento`: devuelve los tres contactos de **una** vivienda, y solo
-- a quien la opera o se aloja en ella. No abre `membresia_unidad`, donde
-- estarían también los vecinos.

create or replace function public.contactos_de_unidad(p_unidad_id uuid)
returns table (
  anfitrion_nombre        text,
  anfitrion_telefono      text,
  administrador_nombre    text,
  administrador_telefono  text,
  propietario_nombre      text,
  propietario_telefono    text
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    anfitrion.nombre,     anfitrion.telefono,
    administrador.nombre, administrador.telefono,
    propietario.nombre,   propietario.telefono
  from (select 1) _
  left join lateral (
    select m.nombre, m.telefono from public.membresia_unidad m
    where m.unidad_id = p_unidad_id and m.activo and m.es_anfitrion_primario
    limit 1
  ) anfitrion on true
  left join lateral (
    select m.nombre, m.telefono from public.membresia_unidad m
    where m.unidad_id = p_unidad_id and m.activo and m.es_admin_primario
    limit 1
  ) administrador on true
  left join lateral (
    select m.nombre, m.telefono from public.membresia_unidad m
    where m.unidad_id = p_unidad_id and m.activo and m.rol = 'propietario'
    limit 1
  ) propietario on true
  -- La funcion es `security definer`, asi que comprueba ella misma quien
  -- pregunta.
  where public.puede_operar_unidad(p_unidad_id)
     or public.es_huesped_de_unidad(p_unidad_id);
$$;

comment on function public.contactos_de_unidad(uuid) is
  'Anfitrion primario, administrador primario y propietario de UNA vivienda. La lee quien opera esa vivienda y el huesped con estancia vigente. Donde no hay nadie asignado devuelve null, para que la pantalla lo diga en vez de inventar un nombre.';

revoke all on function public.contactos_de_unidad(uuid) from public;
grant execute on function public.contactos_de_unidad(uuid) to authenticated;
