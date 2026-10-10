-- El titular declara por un acompañante que no puede registrarse por si mismo.
--
-- Aditiva: cuatro columnas, una restriccion que se amplia y tres funciones.
--
-- Decidido con el cliente el 09/10/2026. Desde el 03/10 cada adulto acepta sus
-- terminos desde su propio enlace y nadie lo hace por el. Eso deja sin salida
-- a quien no puede: una persona que no lee, alguien con una discapacidad, un
-- adulto mayor sin telefono. El KT (4.2, paso 4) ya lo preveia --«sin lista
-- cerrada de causales»-- pero solo para el anfitrion, desde la aplicacion.
--
-- Ahora lo puede declarar **el titular**, en la web, mientras hace su
-- preregistro: escribe el motivo, firma con su nombre y acepta por esa
-- persona. El anfitrion lo ve.
--
-- Lo que NO cambia: el documento de esa persona se sigue pidiendo, y un menor
-- no pasa por aqui --por el responde su adulto, que es otro mecanismo--.

alter table public.invitado
  add column if not exists incapacidad_motivo text,
  add column if not exists incapacidad_declaracion text,
  add column if not exists incapacidad_declarado_por_invitado_id uuid
    references public.invitado(id) on delete set null,
  add column if not exists incapacidad_declarado_en timestamptz;

comment on column public.invitado.incapacidad_motivo is
  'Por que esta persona no puede completar su registro, en palabras del '
  'titular. Texto libre: el KT pide que no haya lista cerrada de causales.';
comment on column public.invitado.incapacidad_declaracion is
  'La declaracion completa, compuesta por la base en el momento de firmar: '
  'quien declara, por quien, por que y que acepta en su nombre.';
comment on column public.invitado.incapacidad_declarado_por_invitado_id is
  'El titular que lo declaro. Es un invitado y no un usuario: quien hace el '
  'preregistro todavia no tiene cuenta.';
comment on column public.invitado.incapacidad_declarado_en is
  'Cuando se declaro. Es tambien lo que dice que la excepcion tiene dueño.';

/*
  Toda excepcion tiene quien la asume. Hasta aqui solo podia ser un usuario
  con cuenta (`terminos_aprobado_por`); ahora tambien el titular de la
  reserva, que firma con fecha. Se mira la fecha y no el identificador de
  quien declaro: si esa fila se borrara, la constancia de que alguien firmo
  --el texto y la fecha-- sigue ahi.
*/
alter table public.invitado
  drop constraint if exists invitado_excepcion_con_aprobador;
alter table public.invitado
  add constraint invitado_excepcion_con_aprobador
  check (
    not terminos_excepcion
    or terminos_aprobado_por is not null
    or (incapacidad_declarado_en is not null and incapacidad_declaracion is not null)
  );

-- ============================================================================
-- Declarar
-- ============================================================================

create or replace function public.declarar_incapacidad_acompanante(
  p_token             text,
  p_invitado_id       uuid,
  p_motivo            text,
  p_nombre_declarante text
)
returns void
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
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
      || ' no puede completar su registro por si mismo. Motivo: ' || v_motivo
      || '. Acepto en su nombre los terminos y condiciones y las reglas del '
      || 'edificio, y respondo por ello. '
      || to_char(now() at time zone v_zona, 'DD/MM/YYYY HH24:MI') || '.',
    terminos_excepcion = true,
    terminos_aceptados = true,
    terminos_aceptados_en = now()
  where id = v_persona.id;
end;
$$;

comment on function public.declarar_incapacidad_acompanante(text, uuid, text, text) is
  'El titular declara que un acompañante adulto no puede registrarse por si '
  'mismo, dice por que, firma y acepta en su nombre. Solo con el enlace de la '
  'estancia.';

grant execute on function public.declarar_incapacidad_acompanante(text, uuid, text, text)
  to anon, authenticated;

-- ============================================================================
-- Retirarla, mientras el preregistro siga abierto
-- ============================================================================

create or replace function public.retirar_incapacidad_acompanante(
  p_token       text,
  p_invitado_id uuid
)
returns void
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_visita uuid;
begin
  select v.id into v_visita
  from public.visita v
  where v.precheckin_token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex')
    and v.precheckin_expira_en > now()
    and v.precheckin_completado_en is null;

  if v_visita is null then
    raise exception 'Ese enlace no vale, ya vencio o el preregistro esta cerrado';
  end if;

  /*
    Solo la que declaro el titular. Una excepcion que aprobo el anfitrion
    --`terminos_aprobado_por`-- no se deshace desde un enlace.
  */
  update public.invitado set
    incapacidad_motivo = null,
    incapacidad_declaracion = null,
    incapacidad_declarado_por_invitado_id = null,
    incapacidad_declarado_en = null,
    terminos_excepcion = false,
    terminos_aceptados = false,
    terminos_aceptados_en = null
  where id = p_invitado_id
    and visita_id = v_visita
    and incapacidad_declarado_en is not null
    and terminos_aprobado_por is null;

  if not found then
    raise exception 'Esa persona no tiene una declaracion que retirar';
  end if;
end;
$$;

grant execute on function public.retirar_incapacidad_acompanante(text, uuid)
  to anon, authenticated;

-- ============================================================================
-- Por quien se declaro, para pintarlo al volver al enlace
-- ============================================================================

create or replace function public.incapacidades_del_precheckin(p_token text)
returns table (invitado_id uuid, motivo text, declarado_en timestamptz)
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
  select i.id, i.incapacidad_motivo, i.incapacidad_declarado_en
  from public.visita v
  join public.invitado i on i.visita_id = v.id
  where v.precheckin_token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex')
    and v.precheckin_expira_en > now()
    and i.incapacidad_declarado_en is not null;
$$;

comment on function public.incapacidades_del_precheckin(text) is
  'Los acompañantes por los que el titular declaro, con su motivo. Solo con '
  'el enlace de la estancia.';

grant execute on function public.incapacidades_del_precheckin(text)
  to anon, authenticated;

notify pgrst, 'reload schema';
