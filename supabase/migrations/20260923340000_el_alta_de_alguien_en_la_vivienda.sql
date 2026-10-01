-- ----------------------------------------------------------------------------
-- El alta de alguien en la vivienda
-- ----------------------------------------------------------------------------
-- El formulario de "Gestion de usuarios" --el que el KT llama asi tras decidir
-- que "Creacion de Rol" confundia-- pide once cosas y las escribia **todas** en
-- `propietario-store`, un store de Zustand: nombre, documento, telefono,
-- contacto de emergencia, si es menor, las banderas de primario, la
-- visibilidad y los datos del contrato. Nada llegaba a ninguna tabla.
--
-- La mitad del problema ya no existe: dar de alta a alguien es
-- `crear_invitacion()`, y si es menor, `registrar_menor()`. Las dos estan
-- hechas. Lo que faltaba es lo que el formulario pide **ademas** del nombre:
--
--   * el contacto de emergencia, que hasta que la persona acepta la invitacion
--     no tiene membresia donde vivir;
--   * el telefono y el documento, que son del perfil de esa persona y no se
--     los pone quien la invita --no puede: es una afirmacion sobre otro--.
--
-- El segundo no se arregla aqui, se quita del formulario: quien invita no
-- rellena el documento de identidad de otra persona. El primero si, porque es
-- justamente algo que la familia sabe y la persona invitada puede no poner.

alter table public.invitacion
  add column if not exists contacto_emergencia_nombre   text,
  add column if not exists contacto_emergencia_codigo   text,
  add column if not exists contacto_emergencia_telefono text;

comment on column public.invitacion.contacto_emergencia_nombre is
  'Viaja con la invitacion y se copia a la membresia al aceptarla: hasta entonces no hay membresia donde ponerlo.';


-- ----------------------------------------------------------------------------
-- `crear_invitacion` lo recibe
-- ----------------------------------------------------------------------------
-- Se anaden al final y con valor por defecto para no romper a ninguno de los
-- sitios que ya la llaman.
--
-- Y se retira la firma anterior: `create or replace` con parametros distintos
-- **no reemplaza nada**, crea una segunda funcion. Con las dos vivas, una
-- llamada de seis argumentos es ambigua y Postgres la rechaza; dieciocho
-- pruebas se pusieron rojas de golpe y el mensaje no decia una palabra de
-- sobrecargas.
drop function if exists public.crear_invitacion(
  uuid, public.ambito_invitacion, text, text, uuid,
  public.rol_unidad, public.rol_condominio, date, date);
drop function if exists public.registrar_menor(uuid, text, text);
create or replace function public.crear_invitacion(
  p_condominio_id  uuid,
  p_ambito         public.ambito_invitacion,
  p_correo         text,
  p_nombre         text,
  p_unidad_id      uuid DEFAULT NULL,
  p_rol_unidad     public.rol_unidad DEFAULT NULL,
  p_rol_condominio public.rol_condominio DEFAULT NULL,
  p_vigente_desde  date DEFAULT NULL,
  p_vigente_hasta  date DEFAULT NULL,
  p_contacto_nombre   text DEFAULT NULL,
  p_contacto_codigo   text DEFAULT NULL,
  p_contacto_telefono text DEFAULT NULL
)
returns table (invitacion_id uuid, token text)
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_token  text := encode(extensions.gen_random_bytes(32), 'hex');
  v_correo text := lower(trim(p_correo));
  v_id     uuid;
begin
  if auth.uid() is null then
    raise exception 'Se requiere una sesion iniciada';
  end if;

  if p_ambito = 'unidad' then
    if not public.puede_invitar_a_unidad(p_unidad_id) then
      raise exception 'No tenes permiso para invitar a esta unidad';
    end if;

    -- La propiedad de una vivienda es un hecho legal que registra la
    -- administracion: quien gestiona la vivienda da de alta a los suyos, no a
    -- su dueño.
    --
    -- El huesped temporal NO entra aqui, aunque la misma frase del KT lo
    -- nombre. Lo que dice es que "va por otro flujo" --el precheckin--, no que
    -- solo la administracion pueda darlo de alta; y ese flujo todavia no
    -- existe (R-90). Restringirlo dejaria al anfitrion sin ninguna forma de
    -- recibir a su huesped, que es el producto entero.
    if p_rol_unidad = 'propietario'
       and not public.es_admin_condominio(p_condominio_id) then
      raise exception 'Solo la administracion puede registrar al propietario de una vivienda';
    end if;
  else
    if not public.es_admin_condominio(p_condominio_id) then
      raise exception 'Solo la administracion del condominio puede invitar a estos roles';
    end if;
  end if;

  if p_rol_unidad = 'huesped_temporal' and p_vigente_hasta is null then
    raise exception 'Una invitacion de huesped temporal necesita la fecha de fin de la estancia';
  end if;

  if p_vigente_hasta is not null and p_vigente_hasta < current_date then
    raise exception 'La estancia termina antes de hoy';
  end if;

  if p_vigente_desde is not null and p_vigente_hasta is not null
     and p_vigente_desde > p_vigente_hasta then
    raise exception 'La estancia termina antes de empezar';
  end if;

  insert into public.invitacion (
    condominio_id, ambito, unidad_id, rol_unidad, rol_condominio,
    correo, nombre, token_hash, invitada_por, expira_en,
    vigente_desde, vigente_hasta,
    contacto_emergencia_nombre, contacto_emergencia_codigo,
    contacto_emergencia_telefono
  ) values (
    p_condominio_id, p_ambito, p_unidad_id, p_rol_unidad, p_rol_condominio,
    v_correo, p_nombre,
    encode(extensions.digest(v_token, 'sha256'), 'hex'),
    auth.uid(), now() + interval '7 days',
    p_vigente_desde, p_vigente_hasta,
    nullif(btrim(coalesce(p_contacto_nombre, '')), ''),
    nullif(btrim(coalesce(p_contacto_codigo, '')), ''),
    nullif(btrim(coalesce(p_contacto_telefono, '')), '')
  )
  returning id into v_id;

  return query select v_id, v_token;
end;
$$;

revoke all on function public.crear_invitacion(uuid, public.ambito_invitacion, text, text, uuid, public.rol_unidad, public.rol_condominio, date, date, text, text, text) from public;
grant execute on function public.crear_invitacion(uuid, public.ambito_invitacion, text, text, uuid, public.rol_unidad, public.rol_condominio, date, date, text, text, text) to authenticated;


-- ----------------------------------------------------------------------------
-- `registrar_menor` tambien
-- ----------------------------------------------------------------------------
-- Un menor no tiene cuenta y no la va a tener: es justamente de quien mas
-- falta hace saber a quien llamar.
create or replace function public.registrar_menor(
  p_unidad_id uuid,
  p_nombre    text,
  p_telefono  text default null,
  p_contacto_nombre   text default null,
  p_contacto_codigo   text default null,
  p_contacto_telefono text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_id uuid;
begin
  if not public.puede_invitar_a_unidad(p_unidad_id) then
    raise exception 'No podes registrar personas en esta vivienda';
  end if;

  if nullif(btrim(coalesce(p_nombre, '')), '') is null then
    raise exception 'Falta el nombre';
  end if;

  insert into public.membresia_unidad
    (unidad_id, usuario_id, nombre, rol, es_menor, puede_acceder, es_residente, telefono,
     contacto_emergencia_nombre, contacto_emergencia_codigo, contacto_emergencia_telefono)
  values
    (p_unidad_id, null, btrim(p_nombre), 'residente', true, false, true,
     nullif(btrim(coalesce(p_telefono, '')), ''),
     nullif(btrim(coalesce(p_contacto_nombre, '')), ''),
     nullif(btrim(coalesce(p_contacto_codigo, '')), ''),
     nullif(btrim(coalesce(p_contacto_telefono, '')), ''))
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.registrar_menor(uuid, text, text, text, text, text) from public;
grant execute on function public.registrar_menor(uuid, text, text, text, text, text) to authenticated;


-- ----------------------------------------------------------------------------
-- Y al aceptar, el contacto se copia a la membresia
-- ----------------------------------------------------------------------------
create or replace function public.copiar_contacto_de_la_invitacion()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_inv record;
begin
  -- Solo en el alta por invitacion, que es la unica que sabe de donde viene.
  if coalesce(current_setting('veciyo.alta_por_invitacion', true), '') <> 'on' then
    return new;
  end if;

  select i.contacto_emergencia_nombre, i.contacto_emergencia_codigo,
         i.contacto_emergencia_telefono
    into v_inv
  from public.invitacion i
  where i.unidad_id = new.unidad_id
    and i.aceptada_por = new.usuario_id
    and i.estado = 'aceptada'
  order by i.aceptada_en desc nulls last
  limit 1;

  if found then
    new.contacto_emergencia_nombre   := coalesce(new.contacto_emergencia_nombre,   v_inv.contacto_emergencia_nombre);
    new.contacto_emergencia_codigo   := coalesce(new.contacto_emergencia_codigo,   v_inv.contacto_emergencia_codigo);
    new.contacto_emergencia_telefono := coalesce(new.contacto_emergencia_telefono, v_inv.contacto_emergencia_telefono);
  end if;

  return new;
end;
$$;

drop trigger if exists membresia_unidad_contacto_de_invitacion on public.membresia_unidad;
create trigger membresia_unidad_contacto_de_invitacion
  before insert on public.membresia_unidad
  for each row execute function public.copiar_contacto_de_la_invitacion();
