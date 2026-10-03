-- ----------------------------------------------------------------------------
-- El huesped recupera lo que ya habia escrito
-- ----------------------------------------------------------------------------
-- Si el huesped cierra su enlace y vuelve, el formulario sale **vacio**. Tiene
-- que teclear otra vez el nombre, los apellidos, el documento, el correo, el
-- telefono, la direccion, las dos ciudades, la fecha de nacimiento, el motivo y
-- el costo. Y volver a subir las dos fotos del documento, sin saber siquiera si
-- las subio ya.
--
-- Todo eso **esta guardado**. Lo escribio `guardar_precheckin` la primera vez.
-- Lo que no hay es forma de leerlo: `consultar_precheckin` devuelve la reserva
-- --el edificio, la vivienda, el anfitrion, las fechas-- y **no toca la tabla
-- `invitado` en ninguna linea**. Su propio comentario lo dice: «lo justo para
-- reconocer la reserva».
--
-- Para un huesped que viaja esto no es un detalle: abandonar el preregistro a
-- medias y volver mas tarde es el caso normal, no la excepcion.
--
-- Solo aditiva: ninguna funcion existente cambia.

create or replace function public.mi_ficha_precheckin(p_token text)
returns table (
  invitado_id        uuid,
  nombre             text,
  apellidos          text,
  tipo_documento     text,
  documento          text,
  correo             text,
  telefono           text,
  direccion          text,
  motivo             text,
  fecha_nacimiento   date,
  ciudad_residencia  text,
  ciudad_procedencia text,
  nacionalidad       text,
  terminos_aceptados boolean,
  costo              numeric,
  moneda             text,
  tiene_documento    boolean
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_visita uuid;
begin
  /*
    La misma validacion que las otras ocho funciones del flujo: el token viaja
    en claro por el enlace y en la base solo vive su sha256, asi que quien tenga
    acceso de lectura a la tabla no puede entrar por aqui.
  */
  select id into v_visita
  from public.visita
  where precheckin_token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex')
    and precheckin_expira_en > now();

  if v_visita is null then
    raise exception 'Ese enlace no vale o ya vencio';
  end if;

  return query
  select
    i.id,
    i.nombre,
    i.apellidos,
    i.tipo_documento::text,
    i.documento_numero,
    i.correo,
    i.telefono,
    i.direccion,
    i.motivo::text,
    i.fecha_nacimiento,
    i.ciudad_residencia,
    i.ciudad_procedencia,
    i.nacionalidad::text,
    i.terminos_aceptados,
    v.costo_estancia,
    v.moneda_costo::text,
    /*
      Si ya subio la foto del documento. **No se devuelve la ruta**: con ella
      cualquiera que tuviera el enlace podria pedirle el archivo al Storage, y
      una foto de una cedula no es un dato mas. Lo unico que la pantalla
      necesita saber es si hay que volver a pedirla.
    */
    (vd.documento_original_path is not null)
  from public.invitado i
  join public.visita v on v.id = i.visita_id
  left join public.verificacion_documento vd on vd.invitado_id = i.id
  where i.visita_id = v_visita
    and i.es_titular;
end;
$$;

comment on function public.mi_ficha_precheckin is
  'Lo que el titular ya escribio en su preregistro, para que al volver al enlace no tenga que teclearlo otra vez. Sin sesion, por el token. No devuelve la ruta de la foto del documento: solo si existe.';

grant execute on function public.mi_ficha_precheckin(text) to anon, authenticated;
