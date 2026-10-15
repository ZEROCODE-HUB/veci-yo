-- La declaración del titular se lee bien (15/10/2026).
--
-- La constancia que redacta la base decía «no puede completar su registro por
-- si mismo» —sin tilde y en masculino, también para Rosa— y «terminos». Se vio
-- en la ficha de la anfitriona recorriendo el preregistro. Ahora dice «sin
-- ayuda», que vale para cualquiera, y «términos». Las constancias ya firmadas
-- no se tocan: son lo que se firmó.

CREATE OR REPLACE FUNCTION public.declarar_incapacidad_acompanante(p_token text, p_invitado_id uuid, p_motivo text, p_nombre_declarante text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_visita   public.visita%rowtype;
  v_titular  uuid;
  v_persona  public.invitado%rowtype;
  v_motivo   text := nullif(btrim(coalesce(p_motivo, '')), '');
  v_firma    text := nullif(btrim(coalesce(p_nombre_declarante, '')), '');
  v_zona     text;
begin
  /*
    Solo con el enlace **de la estancia**, que es el del titular. El enlace de
    un acompañante vive en otra columna y aqui no se busca: nadie se declara
    incapaz a si mismo para saltarse sus terminos, ni declara por un tercero.
  */
  select v.* into v_visita
  from public.visita v
  where v.precheckin_token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex')
    and v.precheckin_expira_en > now();

  if not found then
    raise exception 'Ese enlace no vale o ya vencio';
  end if;

  if v_visita.precheckin_completado_en is not null then
    raise exception 'Este preregistro ya esta cerrado';
  end if;

  select i.id into v_titular
  from public.invitado i
  where i.visita_id = v_visita.id and i.es_titular;

  select i.* into v_persona
  from public.invitado i
  where i.id = p_invitado_id and i.visita_id = v_visita.id;

  if not found then
    raise exception 'Esa persona no esta en esta reserva';
  end if;

  if v_persona.es_titular then
    raise exception 'Quien reserva no puede declarar por si mismo. Si no puedes aceptar, pideselo a tu anfitrion.';
  end if;

  if v_persona.es_menor then
    raise exception 'Por un menor responde su adulto: no hace falta esta declaracion';
  end if;

  -- Quien ya acepto por si mismo, acepto. No se le pone encima una excepcion.
  if v_persona.terminos_aceptados and not v_persona.terminos_excepcion then
    raise exception 'Esa persona ya acepto por si misma';
  end if;

  if v_motivo is null then
    raise exception 'Hace falta decir por que no puede completar su registro';
  end if;

  if v_firma is null then
    raise exception 'Hace falta tu nombre completo para firmar la declaracion';
  end if;

  v_zona := public.zona_horaria_del_condominio(v_visita.condominio_id);

  /*
    El texto lo compone la base y no la pantalla: es lo que queda como
    constancia, y una constancia que redacta quien la firma se puede redactar
    de otra manera.
  */
  update public.invitado set
    incapacidad_motivo = v_motivo,
    incapacidad_declarado_por_invitado_id = v_titular,
    incapacidad_declarado_en = now(),
    incapacidad_declaracion =
      'Yo, ' || v_firma || ', titular de esta reserva, declaro que '
      || btrim(v_persona.nombre || ' ' || coalesce(v_persona.apellidos, ''))
      || ' no puede completar su registro sin ayuda. Motivo: ' || v_motivo
      || '. Acepto en su nombre los términos y condiciones y las reglas del '
      || 'edificio, y respondo por ello. '
      || to_char(now() at time zone v_zona, 'DD/MM/YYYY HH24:MI') || '.',
    terminos_excepcion = true,
    terminos_aceptados = true,
    terminos_aceptados_en = now()
  where id = v_persona.id;
end;
$function$;
