-- ----------------------------------------------------------------------------
-- El titular ve a quien le falta aceptar
-- ----------------------------------------------------------------------------
-- `acompanantes_del_precheckin` devuelve `(id, nombre, apellidos, es_menor)`, y
-- con eso el titular no puede saber **a quien le falta**: ni si aceptaron, ni si
-- tienen documento, ni a que correo mandarles su enlace.
--
-- Desde hoy el preregistro no se cierra hasta que cada adulto acepte lo suyo.
-- Si la pantalla no dice quien falta, el titular pulsa «finalizar», recibe un
-- error con tres nombres y no tiene ninguna forma de actuar sobre ellos.
--
-- Se borra antes de crear: añadir columnas al resultado cambia el tipo de
-- retorno y `create or replace` no puede.
--
-- Solo aditiva en datos: ninguna tabla cambia.

drop function if exists public.acompanantes_del_precheckin(text);

create function public.acompanantes_del_precheckin(p_token text)
returns table (
  id                 uuid,
  nombre             text,
  apellidos          text,
  tipo_documento     text,
  documento_numero   text,
  correo             text,
  telefono           text,
  es_menor           boolean,
  terminos_aceptados boolean,
  /*
    Si ya se le emitio su enlace. No se devuelve el token --en la base vive solo
    su sha256 y el claro no se puede recuperar-- sino el hecho: sirve para que
    la pantalla diga «ya se le mando» en vez de ofrecer generarlo otra vez sin
    avisar de que el anterior deja de valer.
  */
  tiene_enlace       boolean
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_visita uuid;
begin
  select id into v_visita
  from public.visita
  where precheckin_token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex')
    and precheckin_expira_en > now();

  if v_visita is null then
    raise exception 'Ese enlace no vale o ya vencio';
  end if;

  return query
  select
    i.id, i.nombre, i.apellidos, i.tipo_documento::text, i.documento_numero,
    i.correo, i.telefono, i.es_menor, i.terminos_aceptados,
    (i.precheckin_token_hash is not null)
  from public.invitado i
  where i.visita_id = v_visita
    and not i.es_titular
  order by i.orden;
end;
$$;

comment on function public.acompanantes_del_precheckin is
  'Quien viene con el titular y en que estado esta cada uno. Incluye si acepto sus terminos y si ya se le emitio su enlace, que es lo que el titular necesita para saber a quien le falta.';

grant execute on function public.acompanantes_del_precheckin(text) to anon, authenticated;
