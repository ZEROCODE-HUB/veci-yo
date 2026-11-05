-- Cómo coincidió el documento del huésped en portería (05/11/2026).
--
-- Hasta hoy el escaneo llamaba a `anotar_verificacion_en_porteria` con el
-- número **registrado** como «número visto», también cuando lo que había
-- coincidido era el nombre: la base anotaba una comparación de números que no
-- había pasado, y no quedaba forma de saber cómo se validó a nadie. Y si el
-- huésped no tenía número registrado, el escaneo que coincidía por nombre no
-- podía anotarse.
--
-- Ahora el escaneo lee también el código de barras del reverso (PDF417 de la
-- cédula colombiana, Code39 del DNI peruano) y la zona MRZ (pasaportes, cédula
-- digital, DNI electrónico), y cada verificación dice por cuál de los caminos
-- coincidió. La comparación la hace el celular, como pidió el cliente: el texto
-- leído no sale del teléfono, así que la base no tiene con qué repetirla.
--
-- Solo aditivo: un tipo, una columna y una función nuevas. Las dos funciones
-- que ya existían se reescriben solo para rellenar la columna.

create type public.forma_de_verificacion as enum (
  'codigo',    -- el código de barras del reverso trae el número registrado
  'mrz',       -- la zona MRZ trae el número registrado
  'numero',    -- el texto leído trae el número registrado
  'nombre',    -- el texto leído trae un nombre y un apellido registrados
  'tecleado',  -- la portería tecleó el número (flujo de visitas corrientes)
  'a_mano'     -- no coincidió y la portería lo aprobó igual
);

comment on type public.forma_de_verificacion is
  'Por qué camino se dio por bueno el documento de una persona en portería (05/11/2026).';

alter table public.verificacion_documento
  add column coincidio_por public.forma_de_verificacion;

comment on column public.verificacion_documento.coincidio_por is
  'Cómo coincidió el documento: código de barras, MRZ, número o nombre leídos, número tecleado o aprobado a mano. Vacío en las verificaciones de antes del 05/11/2026.';

/*
  El escaneo coincidió en el celular. La misma puerta que las otras dos: guardia
  del edificio y la visita a la vista, con un mismo mensaje para «no existe» y
  «no te toca». Solo admite las formas que salen de un escaneo; teclear y
  aprobar a mano tienen su función.
*/
create or replace function public.verificar_documento_escaneado(
  p_invitado_id uuid,
  p_coincidio_por public.forma_de_verificacion
)
returns boolean
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_condominio uuid;
  v_visita     uuid;
begin
  select v.condominio_id, v.id
    into v_condominio, v_visita
  from public.invitado i
  join public.visita v on v.id = i.visita_id
  where i.id = p_invitado_id;

  if v_condominio is null
     or not public.es_guardia_de_condominio(v_condominio)
     or not public.puede_ver_visita(v_visita) then
    raise exception 'Esa persona no esta en la lista de la porteria'
      using errcode = '42501';
  end if;

  if p_coincidio_por is null or p_coincidio_por not in ('codigo', 'mrz', 'numero', 'nombre') then
    raise exception 'Eso no sale de un escaneo';
  end if;

  insert into public.verificacion_documento
    (invitado_id, estado, verificado_por, verificado_en, aprobado_a_mano, coincidio_por)
  values (
    p_invitado_id, 'verificado'::estado_verificacion, auth.uid(), now(), false, p_coincidio_por
  )
  on conflict (invitado_id) do update set
    estado          = excluded.estado,
    verificado_por  = excluded.verificado_por,
    verificado_en   = excluded.verificado_en,
    aprobado_a_mano = false,
    coincidio_por   = excluded.coincidio_por;

  return true;
end;
$$;

comment on function public.verificar_documento_escaneado(uuid, public.forma_de_verificacion) is
  'La portería escaneó el documento y coincidió en el celular: lo deja verificado diciendo por qué camino (05/11/2026).';

revoke all on function public.verificar_documento_escaneado(uuid, public.forma_de_verificacion) from public, anon;
grant execute on function public.verificar_documento_escaneado(uuid, public.forma_de_verificacion) to authenticated;

-- Las dos que ya existían, iguales salvo por la columna nueva.
create or replace function public.anotar_verificacion_en_porteria(
  p_invitado_id uuid, p_numero_visto text, p_observaciones text default null::text
)
returns boolean
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_condominio uuid;
  v_visita     uuid;
  v_en_ficha   text;
  v_visto      text := upper(regexp_replace(coalesce(p_numero_visto, ''), '[^A-Za-z0-9]', '', 'g'));
  v_coincide   boolean;
begin
  select v.condominio_id, v.id,
         upper(regexp_replace(coalesce(i.documento_numero, ''), '[^A-Za-z0-9]', '', 'g'))
    into v_condominio, v_visita, v_en_ficha
  from public.invitado i
  join public.visita v on v.id = i.visita_id
  where i.id = p_invitado_id;

  if v_condominio is null
     or not public.es_guardia_de_condominio(v_condominio)
     or not public.puede_ver_visita(v_visita) then
    raise exception 'Esa persona no esta en la lista de la porteria'
      using errcode = '42501';
  end if;

  if v_visto = '' then
    raise exception 'Hace falta el numero del documento que te enseñan';
  end if;

  if v_en_ficha = '' then
    raise exception 'Esta persona no escribio su documento en el preregistro: no hay con que compararlo';
  end if;

  v_coincide := v_visto = v_en_ficha;

  insert into public.verificacion_documento
    (invitado_id, estado, verificado_por, verificado_en, observaciones, aprobado_a_mano, coincidio_por)
  values (
    p_invitado_id,
    case when v_coincide then 'verificado' else 'no_coincide' end::estado_verificacion,
    auth.uid(), now(),
    nullif(btrim(coalesce(p_observaciones, '')), ''),
    false,
    case when v_coincide then 'tecleado' end::public.forma_de_verificacion
  )
  on conflict (invitado_id) do update set
    estado          = excluded.estado,
    verificado_por  = excluded.verificado_por,
    verificado_en   = excluded.verificado_en,
    aprobado_a_mano = false,
    coincidio_por   = excluded.coincidio_por,
    observaciones   = coalesce(excluded.observaciones, public.verificacion_documento.observaciones);

  return v_coincide;
end;
$$;

create or replace function public.aprobar_documento_a_mano(
  p_invitado_id uuid, p_observaciones text default null::text
)
returns boolean
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_condominio uuid;
  v_visita     uuid;
begin
  select v.condominio_id, v.id
    into v_condominio, v_visita
  from public.invitado i
  join public.visita v on v.id = i.visita_id
  where i.id = p_invitado_id;

  if v_condominio is null
     or not public.es_guardia_de_condominio(v_condominio)
     or not public.puede_ver_visita(v_visita) then
    raise exception 'Esa persona no esta en la lista de la porteria'
      using errcode = '42501';
  end if;

  insert into public.verificacion_documento
    (invitado_id, estado, verificado_por, verificado_en, observaciones, aprobado_a_mano, coincidio_por)
  values (
    p_invitado_id, 'verificado'::estado_verificacion, auth.uid(), now(),
    nullif(btrim(coalesce(p_observaciones, '')), ''), true, 'a_mano'
  )
  on conflict (invitado_id) do update set
    estado          = excluded.estado,
    verificado_por  = excluded.verificado_por,
    verificado_en   = excluded.verificado_en,
    aprobado_a_mano = true,
    coincidio_por   = 'a_mano',
    observaciones   = coalesce(excluded.observaciones, public.verificacion_documento.observaciones);

  return true;
end;
$$;
