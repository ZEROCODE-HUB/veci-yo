-- El huesped llena su ficha: lo que el precheckin escribe.
--
-- Segunda parte de unificar las dos formas de ser huesped temporal (R-26).
-- La primera puso el enlace; esta pone donde cae lo que el huesped escribe
-- cuando lo abre.
--
-- Las pantallas ya existen y estan aprobadas --`veciyo-web`, rutas
-- `/access/:token` → `/pre-check-in` → `/confirm-data` → `/companions`--,
-- pero no guardan nada: los campos de telefono, direccion y motivo son
-- `defaultValue` sin lector, y al pulsar "Confirmar y continuar" se pierden.
-- Lo que falta es la tabla donde ponerlos.
--
-- Aditiva: no borra ninguna columna ni ninguna fila.

-- 1. Por que viene ----------------------------------------------------------

-- Enum y no texto libre. Ya paso con el "Departamento" del formulario de
-- zonas: un campo abierto se llena de "102", "Apto 102", "apartamento 102" y
-- deja de servir para agrupar nada. Los cinco valores son los que la pantalla
-- ya ofrece, y son tambien los que pide el registro de turismo.
do $$
begin
  if not exists (select 1 from pg_type where typname = 'motivo_estancia') then
    create type public.motivo_estancia as enum
      ('turismo', 'negocios', 'trabajo', 'estudios', 'transito');
  end if;
end $$;

-- 2. Quien viene -------------------------------------------------------------

alter table public.invitado
  add column if not exists apellidos text,
  add column if not exists telefono text,
  add column if not exists direccion text,
  add column if not exists motivo motivo_estancia,
  add column if not exists auto_registro boolean not null default false,
  add column if not exists precheckin_token_hash text,
  add column if not exists precheckin_completado_en timestamptz;

comment on column public.invitado.apellidos is
  'Aparte del nombre porque el documento los trae aparte y la pantalla los pide aparte. Juntarlos obliga a partir por el primer espacio, que es como se pierden los apellidos compuestos.';
comment on column public.invitado.direccion is
  'Domicilio habitual, no la vivienda donde se aloja: es lo que pide el registro de turismo.';
comment on column public.invitado.auto_registro is
  'El acompañante prefirio cargar sus propios datos. Entonces se le emite su enlace --`/access/acompanante/:id`-- en vez de que el titular teclee su documento.';
comment on column public.invitado.precheckin_token_hash is
  'Solo de los acompañantes que se registran solos. El del titular vive en `visita`, porque el suyo abre la estancia entera.';

create unique index if not exists invitado_precheckin_token
  on public.invitado (precheckin_token_hash)
  where precheckin_token_hash is not null;

-- 3. En que viene ------------------------------------------------------------

alter table public.vehiculo_visita
  add column if not exists marca text,
  add column if not exists color text;

comment on column public.vehiculo_visita.color is
  'La porteria reconoce un coche por el color antes que por la placa, y es lo que la pantalla del precheckin ya pide.';

-- 4. Guardar la ficha del titular --------------------------------------------

create or replace function public.guardar_precheckin(
  p_token          text,
  p_nombre         text,
  p_apellidos      text,
  p_tipo_documento tipo_documento,
  p_documento      text,
  p_correo         text,
  p_telefono       text default null,
  p_direccion      text default null,
  p_motivo         motivo_estancia default null,
  p_fecha_nacimiento date default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_visita uuid;
  v_id     uuid;
begin
  -- Un solo sitio decide si el enlace vale. Comprobarlo en la pantalla ademas
  -- no sobra, pero comprobarlo SOLO en la pantalla no es comprobarlo.
  select id into v_visita
  from public.visita
  where precheckin_token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex')
    and precheckin_expira_en > now();

  if v_visita is null then
    raise exception 'Ese enlace no vale o ya vencio';
  end if;

  if coalesce(btrim(p_nombre), '') = '' or coalesce(btrim(p_documento), '') = '' then
    raise exception 'Hace falta el nombre y el numero de documento';
  end if;

  if position('@' in coalesce(p_correo, '')) = 0 then
    raise exception 'El correo no parece valido';
  end if;

  -- Rellenar, no duplicar: el anfitrion pudo dejar la fila creada con el
  -- nombre puesto al reservar. `es_titular` tiene indice unico por visita, asi
  -- que como mucho hay una.
  select id into v_id
  from public.invitado where visita_id = v_visita and es_titular;

  if v_id is null then
    insert into public.invitado (visita_id, orden, nombre, es_titular)
    values (v_visita, 0, btrim(p_nombre), true)
    returning id into v_id;
  end if;

  update public.invitado set
    nombre           = btrim(p_nombre),
    apellidos        = nullif(btrim(coalesce(p_apellidos, '')), ''),
    tipo_documento   = p_tipo_documento,
    documento_numero = btrim(p_documento),
    correo           = lower(btrim(p_correo)),
    telefono         = nullif(btrim(coalesce(p_telefono, '')), ''),
    direccion        = nullif(btrim(coalesce(p_direccion, '')), ''),
    motivo           = coalesce(p_motivo, motivo),
    fecha_nacimiento = coalesce(p_fecha_nacimiento, fecha_nacimiento)
  where id = v_id;

  return v_id;
end;
$$;

comment on function public.guardar_precheckin is
  'Escribe la ficha del titular desde el enlace, SIN sesion. Rellena la fila que el anfitrion dejo al reservar en vez de crear otra.';

-- 5. Aceptar los terminos desde el enlace ------------------------------------

create or replace function public.aceptar_terminos_precheckin(p_token text)
returns void
language plpgsql
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

  -- `terminos_aprobado_por` se queda en null a proposito: los acepto el propio
  -- huesped. Se rellena solo cuando el anfitrion los aprueba por excepcion, y
  -- es lo que distingue "acepto" de "se los aprobaron".
  update public.invitado
  set terminos_aceptados = true
  where visita_id = v_visita and es_titular;
end;
$$;

grant execute on function public.guardar_precheckin(
  text, text, text, tipo_documento, text, text, text, text, motivo_estancia, date
) to anon, authenticated;
grant execute on function public.aceptar_terminos_precheckin(text) to anon, authenticated;
