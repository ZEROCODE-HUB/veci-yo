-- ----------------------------------------------------------------------------
-- La llamada por la app suena en el celular aunque la app esté cerrada
-- (28/10/2026)
-- ----------------------------------------------------------------------------
-- Hasta hoy una llamada solo sonaba con la app abierta (Realtime). Ahora,
-- cuando empieza, la base le pide a la función `avisar-llamada` que mande un
-- push a quienes les suena (`le_suena_la_llamada`), y cuando deja de sonar
-- --la contestan, la rechazan, cuelgan o nadie contesta--, otro para quitarlo.
--
--   · Android con el APK nuevo: el push se cambia por una llamada de verdad
--     (pantalla completa sobre el bloqueo, tono en bucle, Contestar/Rechazar).
--   · Android con un APK anterior, e iPhone: llega como aviso «X te llama».
--   · iPhone con CallKit (nivel 2): `dispositivo_voip` guarda el token de
--     PushKit de cada iPhone. Mientras no haya cuenta de Apple ni llave APNs,
--     la función no tiene a dónde mandarlo y sigue con el aviso.
--
-- El tope de un minuto ya existía (`llamada_segundos_sin_contestar`). Solo
-- aditiva: una tabla nueva, funciones y disparadores nuevos.

create table if not exists public.dispositivo_voip (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references auth.users(id) on delete cascade,
  token text not null,
  entorno text not null default 'produccion' check (entorno in ('produccion', 'desarrollo')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint dispositivo_voip_token_unico unique (token)
);

comment on table public.dispositivo_voip is
  'El token de PushKit (VoIP) de cada iPhone con la sesión abierta. Lo apunta la app al entrar y lo quita al salir. Con él la llamada por la app llega como llamada de CallKit. 28/10/2026.';
comment on column public.dispositivo_voip.token is 'El token de PushKit del iPhone, en hexadecimal.';
comment on column public.dispositivo_voip.entorno is 'Contra qué servidor de Apple vale el token: produccion (TestFlight y App Store) o desarrollo (compilado desde Xcode).';

create index if not exists dispositivo_voip_usuario on public.dispositivo_voip (usuario_id);

alter table public.dispositivo_voip enable row level security;

drop policy if exists dispositivo_voip_propio on public.dispositivo_voip;
create policy dispositivo_voip_propio on public.dispositivo_voip
  for all
  using (usuario_id = auth.uid())
  with check (usuario_id = auth.uid());

drop trigger if exists dispositivo_voip_tocar_updated_at on public.dispositivo_voip;
create trigger dispositivo_voip_tocar_updated_at
  before update on public.dispositivo_voip
  for each row execute function public.tocar_updated_at();

/*
  Apuntar el token del iPhone. Un mismo iPhone que cambia de cuenta se lleva
  el token: el `unique` haría fallar el alta y la política no deja ver la fila
  de la otra cuenta para borrarla.
*/
create or replace function public.apuntar_dispositivo_voip(p_token text, p_entorno text default 'produccion')
returns void
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
begin
  if auth.uid() is null then
    raise exception 'Hace falta una sesión';
  end if;
  if coalesce(trim(p_token), '') = '' then
    raise exception 'Falta el token';
  end if;
  insert into public.dispositivo_voip (usuario_id, token, entorno)
  values (auth.uid(), trim(p_token), coalesce(p_entorno, 'produccion'))
  on conflict (token) do update
    set usuario_id = excluded.usuario_id, entorno = excluded.entorno, updated_at = now();
end;
$function$;

comment on function public.apuntar_dispositivo_voip(text, text) is
  'Apunta el token de PushKit de este iPhone a la cuenta con la sesión abierta (si era de otra cuenta, pasa a esta).';

revoke execute on function public.apuntar_dispositivo_voip(text, text) from public, anon;
grant execute on function public.apuntar_dispositivo_voip(text, text) to authenticated, service_role;

-- A quiénes les suena una llamada: lo que la función necesita para el push.
create or replace function public.quienes_reciben_la_llamada(p_llamada_id uuid)
returns table (usuario_id uuid)
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $function$
  select distinct gente.usuario_id
  from public.llamada_internet l
  cross join lateral (
    select mc.usuario_id from public.membresia_condominio mc
    where mc.condominio_id = l.condominio_id and mc.activo and mc.usuario_id is not null
    union
    select m.usuario_id from public.membresia_unidad m
    where l.destino = 'vivienda' and m.unidad_id = l.a_unidad_id and m.activo
  ) gente
  where l.id = p_llamada_id
    and gente.usuario_id is distinct from l.de_usuario_id
    and public.le_suena_la_llamada(gente.usuario_id, l.destino, l.origen, l.condominio_id, l.a_unidad_id);
$function$;

comment on function public.quienes_reciben_la_llamada(uuid) is
  'Las personas a las que les suena esa llamada (le_suena_la_llamada), menos quien llama. Interna: la usa la función avisar-llamada.';

revoke execute on function public.quienes_reciben_la_llamada(uuid) from public, anon, authenticated;
grant execute on function public.quienes_reciben_la_llamada(uuid) to service_role;

-- La base avisa a la función: al empezar a sonar y al dejar de sonar.
create or replace function public.avisar_llamada_al_celular()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp', 'extensions'
as $function$
declare
  v_evento text;
  v_id     uuid;
  v_url    text;
  v_clave  text;
begin
  if tg_op = 'INSERT' then
    if new.estado <> 'sonando' then return new; end if;
    v_evento := 'sonando';
    v_id := new.id;
  elsif tg_op = 'UPDATE' then
    if old.estado <> 'sonando' or new.estado = 'sonando' then return new; end if;
    v_evento := 'fin';
    v_id := new.id;
  else
    -- Borrada mientras sonaba (las pruebas borran sus llamadas): que deje de
    -- sonar en los celulares. La función ya no la encuentra, así que se le
    -- pasa a quiénes avisar.
    if old.estado <> 'sonando' then return old; end if;
    v_evento := 'fin';
    v_id := old.id;
  end if;

  if not public.parametro_booleano('push_activo') then
    return coalesce(new, old);
  end if;

  select decrypted_secret into v_url from vault.decrypted_secrets where name = 'veciyo_url_funciones';
  select decrypted_secret into v_clave from vault.decrypted_secrets where name = 'veciyo_clave_servicio';
  if v_url is null or v_clave is null then
    return coalesce(new, old);
  end if;

  perform net.http_post(
    url     := v_url || '/functions/v1/avisar-llamada',
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || v_clave),
    body    := jsonb_build_object(
      'llamadaId', v_id,
      'evento', v_evento,
      'para', case when tg_op = 'DELETE'
                   then (select coalesce(jsonb_agg(q.usuario_id), '[]'::jsonb)
                         from public.quienes_reciben_la_llamada(old.id) q)
              end
    ),
    timeout_milliseconds := public.parametro_entero('push_espera_segundos') * 1000
  );
  return coalesce(new, old);
exception when others then
  -- Que no llegue el aviso al celular no puede impedir la llamada.
  return coalesce(new, old);
end;
$function$;

comment on function public.avisar_llamada_al_celular() is
  'Al empezar a sonar una llamada por la app, y al dejar de sonar, pide a la función avisar-llamada el push a quienes la reciben. Si falla, la llamada sigue igual.';

revoke execute on function public.avisar_llamada_al_celular() from public, anon, authenticated;

drop trigger if exists llamada_internet_suena_en_el_celular on public.llamada_internet;
create trigger llamada_internet_suena_en_el_celular
  after insert on public.llamada_internet
  for each row execute function public.avisar_llamada_al_celular();

drop trigger if exists llamada_internet_deja_de_sonar on public.llamada_internet;
create trigger llamada_internet_deja_de_sonar
  after update of estado on public.llamada_internet
  for each row execute function public.avisar_llamada_al_celular();

drop trigger if exists llamada_internet_borrada_deja_de_sonar on public.llamada_internet;
create trigger llamada_internet_borrada_deja_de_sonar
  before delete on public.llamada_internet
  for each row execute function public.avisar_llamada_al_celular();
