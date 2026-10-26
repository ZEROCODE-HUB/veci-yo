-- ----------------------------------------------------------------------------
-- Aprobar el documento a mano, y los errores de la app (26/10/2026)
-- ----------------------------------------------------------------------------
-- 1. El cliente: «si no coincide el documento debe salir un error y darte la
--    opción de volver a escanear o de aprobar manualmente; ahí sale una
--    advertencia y se guarda quién lo está aprobando». La aprobación a mano
--    deja la verificación en `verificado` --todo lo que pregunta por eso sigue
--    igual-- con `aprobado_a_mano` y el guardia en `verificado_por`.
--
-- 2. Al escanear el documento la app se quedaba en blanco en el celular del
--    tester, y no había forma de saber por qué: la app no guardaba sus errores
--    en ningún sitio. `error_de_la_app` los guarda, con los pasos del escaneo
--    como rastro. Solo se escribe: nadie los lee por la API (los mira el
--    equipo con la clave de servicio), porque pueden llevar datos de quien los
--    tuvo.
--
-- Solo aditiva.

alter table public.verificacion_documento
  add column if not exists aprobado_a_mano boolean not null default false;

comment on column public.verificacion_documento.aprobado_a_mano is
  'La portería lo dio por bueno sin que coincidiera el documento (escaneado o tecleado). Quién y cuándo: verificado_por y verificado_en. Lo pone aprobar_documento_a_mano; una verificación por número lo vuelve a false.';

create or replace function public.aprobar_documento_a_mano(
  p_invitado_id   uuid,
  p_observaciones text default null
)
returns boolean
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_condominio uuid;
  v_visita     uuid;
begin
  select v.condominio_id, v.id
    into v_condominio, v_visita
  from public.invitado i
  join public.visita v on v.id = i.visita_id
  where i.id = p_invitado_id;

  -- La misma puerta que anotar_verificacion_en_porteria, con el mismo mensaje
  -- para «no existe» y «no te toca».
  if v_condominio is null
     or not public.es_guardia_de_condominio(v_condominio)
     or not public.puede_ver_visita(v_visita) then
    raise exception 'Esa persona no esta en la lista de la porteria'
      using errcode = '42501';
  end if;

  insert into public.verificacion_documento
    (invitado_id, estado, verificado_por, verificado_en, observaciones, aprobado_a_mano)
  values (
    p_invitado_id, 'verificado'::estado_verificacion, auth.uid(), now(),
    nullif(btrim(coalesce(p_observaciones, '')), ''), true
  )
  on conflict (invitado_id) do update set
    estado          = excluded.estado,
    verificado_por  = excluded.verificado_por,
    verificado_en   = excluded.verificado_en,
    aprobado_a_mano = true,
    observaciones   = coalesce(excluded.observaciones, public.verificacion_documento.observaciones);

  return true;
end;
$function$;

comment on function public.aprobar_documento_a_mano(uuid, text) is
  'La portería aprueba el documento sin que coincida. Deja estado verificado, aprobado_a_mano y quién lo aprobó.';

-- Una verificación por número que coincide ya no es «a mano».
create or replace function public.anotar_verificacion_en_porteria(p_invitado_id uuid, p_numero_visto text, p_observaciones text DEFAULT NULL::text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
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

  /*
    Guardia de ese edificio, y con la visita a la vista: la misma ventana que
    la lista. Un mismo mensaje para «no existe» y «no te toca», para que la
    funcion no sirva de oraculo.
  */
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

  /*
    «Coincide» lo decide la base, no un boton: el numero que la porteria lee
    en el documento fisico contra el que el huesped escribio. Sin puntos,
    guiones ni mayusculas de por medio.
  */
  v_coincide := v_visto = v_en_ficha;

  insert into public.verificacion_documento
    (invitado_id, estado, verificado_por, verificado_en, observaciones, aprobado_a_mano)
  values (
    p_invitado_id,
    case when v_coincide then 'verificado' else 'no_coincide' end::estado_verificacion,
    auth.uid(), now(),
    nullif(btrim(coalesce(p_observaciones, '')), ''),
    false
  )
  on conflict (invitado_id) do update set
    estado          = excluded.estado,
    verificado_por  = excluded.verificado_por,
    verificado_en   = excluded.verificado_en,
    aprobado_a_mano = false,
    observaciones   = coalesce(excluded.observaciones, public.verificacion_documento.observaciones);

  return v_coincide;
end;
$function$;

-- ----------------------------------------------------------------------------
-- Los errores de la app
-- ----------------------------------------------------------------------------

do $$
begin
  if not exists (select 1 from pg_type where typname = 'tipo_error_de_la_app') then
    create type public.tipo_error_de_la_app as enum ('error', 'rastro');
  end if;
end;
$$;

comment on type public.tipo_error_de_la_app is
  'error: algo reventó. rastro: un paso que la app anota para saber hasta dónde llegó antes de un fallo.';

create table if not exists public.error_de_la_app (
  id          uuid primary key default gen_random_uuid(),
  usuario_id  uuid references auth.users(id) on delete set null default auth.uid(),
  tipo        public.tipo_error_de_la_app not null default 'error',
  mensaje     text not null check (char_length(mensaje) <= 2000),
  detalle     text check (char_length(detalle) <= 8000),
  donde       text check (char_length(donde) <= 200),
  version     text check (char_length(version) <= 100),
  plataforma  text check (char_length(plataforma) <= 50),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.error_de_la_app is
  'Errores y rastros que manda la app. Solo se insertan, a nombre de quien los manda; nadie los lee por la API.';
comment on column public.error_de_la_app.donde is
  'La pantalla o el paso, por ejemplo «escaneo: foto tomada».';

create index if not exists error_de_la_app_fecha_idx on public.error_de_la_app (created_at desc);

drop trigger if exists error_de_la_app_updated_at on public.error_de_la_app;
create trigger error_de_la_app_updated_at
  before update on public.error_de_la_app
  for each row execute function public.tocar_updated_at();

alter table public.error_de_la_app enable row level security;

drop policy if exists error_de_la_app_alta_propia on public.error_de_la_app;
create policy error_de_la_app_alta_propia on public.error_de_la_app
  for insert to authenticated
  with check (usuario_id = auth.uid());
