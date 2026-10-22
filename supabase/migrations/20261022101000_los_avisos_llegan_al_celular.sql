-- Los avisos llegan al celular (push con OneSignal), 22/10/2026.
--
-- Pedido del cliente: «conecta One Signal». La campana ya existía: todo aviso
-- es una fila de `notificacion`. Aquí cada fila nueva sale también como push,
-- si la persona no lo apagó para ese motivo y la plataforma lo tiene encendido.
--
-- Cómo viaja: un disparador sobre `notificacion` anota el envío en
-- `envio_push` y llama a la función `enviar-push` con `pg_net`, que es
-- asíncrono (igual que la consulta de antecedentes): un OneSignal lento no
-- frena a quien creó el aviso. La función habla con OneSignal y deja en la
-- misma fila si salió, si la persona no tiene ningún celular registrado, o por
-- qué falló. La app, cuando el push le llega, marca `recibido_en`.
--
-- Aditiva: columna nueva, tabla nueva, parámetros nuevos y funciones nuevas o
-- ampliadas. `avisos_de_cada_uno` y `guardar_aviso` se rehacen porque cambia
-- lo que devuelven / reciben (Postgres no deja hacerlo con `create or replace`).

-- ---------------------------------------------------------------------------
-- Parámetros
-- ---------------------------------------------------------------------------

insert into public.configuracion_plataforma
  (clave, valor, valor_por_defecto, tipo, unidad, minimo, maximo, ambito, categoria, riesgo, es_publico, valores_permitidos, descripcion)
values
  ('push_activo', 'true', 'true', 'booleano', null, null, null, 'plataforma', 'avisos', 'medio', false, null,
   'Si los avisos de la campana salen también como push al celular (OneSignal). Apagado, la campana sigue igual y no sale ningún push.'),
  ('avisos_push_por_defecto', 'true', 'true', 'booleano', null, null, null, 'plataforma', 'avisos', 'bajo', true, null,
   'Si los avisos llegan al celular a quien nunca tocó sus preferencias.'),
  ('onesignal_app_id', '2574855e-1a75-4f5d-b473-33087659e85c', '2574855e-1a75-4f5d-b473-33087659e85c', 'texto', null, null, null, 'plataforma', 'integraciones', 'alto', true, null,
   'Identificador de la app en OneSignal (no es secreto: lo lleva la app). La clave para enviar es aparte y vive en los secretos de las funciones (ONESIGNAL_REST_API_KEY).'),
  ('push_espera_segundos', '15', '15', 'segundos', 'segundos', 5, 60, 'plataforma', 'avisos', 'bajo', false, null,
   'Segundos que se espera a OneSignal al mandar un push antes de darlo por fallido.'),
  ('aviso_prueba_espera_segundos', '10', '10', 'segundos', 'segundos', 0, 600, 'plataforma', 'avisos', 'bajo', true, null,
   'Segundos que hay que esperar entre dos avisos de prueba de la misma persona (Perfil › Avisos).')
on conflict (clave) do nothing;

-- ---------------------------------------------------------------------------
-- La preferencia por motivo
-- ---------------------------------------------------------------------------

alter table public.preferencia_aviso
  add column if not exists por_push boolean not null
    default public.parametro_booleano('avisos_push_por_defecto');

comment on column public.preferencia_aviso.por_push is
  'Si este motivo le llega a esta persona como push al celular. Lo respeta el disparador que manda el push (quiere_aviso con canal push).';

create or replace function public.quiere_aviso(p_usuario_id uuid, p_motivo motivo_notificacion, p_canal text)
 returns boolean
 language sql
 stable security definer
 set search_path to 'public', 'pg_temp'
as $function$
  select case
    -- La alarma de panico va siempre y por todo lo que haya.
    when p_motivo = 'sos_activado' then true
    when p_canal = 'app' then coalesce(
      (select p.por_app from public.preferencia_aviso p
       where p.usuario_id = p_usuario_id and p.motivo = p_motivo), public.parametro_booleano('avisos_app_por_defecto'))
    when p_canal = 'push' then coalesce(
      (select p.por_push from public.preferencia_aviso p
       where p.usuario_id = p_usuario_id and p.motivo = p_motivo), public.parametro_booleano('avisos_push_por_defecto'))
    when p_canal = 'correo' then coalesce(
      (select p.por_correo from public.preferencia_aviso p
       where p.usuario_id = p_usuario_id and p.motivo = p_motivo), public.parametro_booleano('avisos_correo_por_defecto'))
    when p_canal = 'whatsapp' then coalesce(
      (select p.por_whatsapp from public.preferencia_aviso p
       where p.usuario_id = p_usuario_id and p.motivo = p_motivo), public.parametro_booleano('avisos_whatsapp_por_defecto'))
    -- Un canal que no existe no recibe nada. Mejor que `true`: un error de
    -- escritura en el nombre no debe convertirse en avisar por todas partes.
    else false
  end;
$function$;

drop function if exists public.avisos_de_cada_uno();

create function public.avisos_de_cada_uno()
 returns table(motivo motivo_notificacion, por_app boolean, por_correo boolean, por_whatsapp boolean, por_push boolean, configurable boolean)
 language sql
 stable
 set search_path to 'public', 'pg_temp'
as $function$
  select
    m.motivo,
    coalesce(p.por_app, public.parametro_booleano('avisos_app_por_defecto')),
    coalesce(p.por_correo, public.parametro_booleano('avisos_correo_por_defecto')),
    coalesce(p.por_whatsapp, public.parametro_booleano('avisos_whatsapp_por_defecto')),
    coalesce(p.por_push, public.parametro_booleano('avisos_push_por_defecto')),
    m.motivo <> 'sos_activado'
  from (
    select unnest(enum_range(null::public.motivo_notificacion)) as motivo
  ) m
  left join public.preferencia_aviso p
    on p.motivo = m.motivo and p.usuario_id = auth.uid()
  -- El aviso de prueba no es una preferencia: se pide a mano y llega siempre.
  where m.motivo <> 'aviso_de_prueba'
  order by m.motivo;
$function$;

comment on function public.avisos_de_cada_uno() is
  'Por dónde quiere quien llama que le avisen de cada motivo: campana, correo, WhatsApp y celular (push). Sin fila propia, el valor por defecto de la plataforma.';

grant execute on function public.avisos_de_cada_uno() to authenticated;

drop function if exists public.guardar_aviso(motivo_notificacion, boolean, boolean, boolean);

create function public.guardar_aviso(
  p_motivo motivo_notificacion,
  p_por_app boolean,
  p_por_correo boolean,
  p_por_whatsapp boolean,
  p_por_push boolean default null
)
 returns boolean
 language plpgsql
 set search_path to 'public', 'pg_temp'
as $function$
begin
  -- `security invoker`: la politica exige `usuario_id = auth.uid()`, asi que
  -- nadie guarda las preferencias de otro.
  insert into public.preferencia_aviso
    (usuario_id, motivo, por_app, por_correo, por_whatsapp, por_push)
  values
    (auth.uid(), p_motivo, p_por_app, p_por_correo, p_por_whatsapp,
     coalesce(p_por_push, public.parametro_booleano('avisos_push_por_defecto')))
  on conflict (usuario_id, motivo) do update
    set por_app      = excluded.por_app,
        por_correo   = excluded.por_correo,
        por_whatsapp = excluded.por_whatsapp,
        -- Quien no manda el push (una version vieja de la app) no lo pisa.
        por_push     = coalesce(p_por_push, preferencia_aviso.por_push);

  return true;
end;
$function$;

comment on function public.guardar_aviso(motivo_notificacion, boolean, boolean, boolean, boolean) is
  'Guarda por dónde quiere quien llama que le avisen de un motivo. p_por_push nulo deja el valor que había.';

grant execute on function public.guardar_aviso(motivo_notificacion, boolean, boolean, boolean, boolean) to authenticated;

-- ---------------------------------------------------------------------------
-- El registro de cada envío
-- ---------------------------------------------------------------------------

create type public.estado_envio_push as enum (
  'pendiente',       -- anotado, la función todavía no respondió
  'enviado',         -- OneSignal lo aceptó
  'sin_dispositivo', -- la persona no tiene ningún celular registrado
  'apagado',         -- la persona lo apagó para este motivo, o la plataforma lo tiene apagado
  'error'            -- falló: el motivo va en `detalle`
);

comment on type public.estado_envio_push is
  'En qué quedó el push de un aviso de la campana.';

create table public.envio_push (
  id              uuid primary key default gen_random_uuid(),
  notificacion_id uuid not null unique references public.notificacion(id) on delete cascade,
  usuario_id      uuid not null references auth.users(id) on delete cascade,
  estado          public.estado_envio_push not null default 'pendiente',
  onesignal_id    text,
  detalle         text,
  enviado_en      timestamptz,
  recibido_en     timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

comment on table public.envio_push is
  'Un push por aviso de la campana: si salió, si llegó al celular y, si no, por qué. Lo escriben el disparador de notificacion y la función enviar-push; recibido_en lo marca la app.';
comment on column public.envio_push.id is 'Identificador del envío.';
comment on column public.envio_push.notificacion_id is 'El aviso de la campana que se mandó como push.';
comment on column public.envio_push.usuario_id is 'A quién va (el mismo de la notificación). En OneSignal es su external_id.';
comment on column public.envio_push.estado is 'En qué quedó: pendiente, enviado, sin_dispositivo, apagado o error.';
comment on column public.envio_push.onesignal_id is 'El identificador que OneSignal le dio al envío, para buscarlo en su panel.';
comment on column public.envio_push.detalle is 'Por qué no salió, o la respuesta de OneSignal si algo fue raro.';
comment on column public.envio_push.enviado_en is 'Cuándo lo aceptó OneSignal.';
comment on column public.envio_push.recibido_en is 'Cuándo dijo la app que el push le llegó (al verlo con la app abierta o al tocarlo).';
comment on column public.envio_push.created_at is 'Cuándo se anotó.';
comment on column public.envio_push.updated_at is 'Última vez que cambió.';

create index envio_push_usuario_idx on public.envio_push (usuario_id, created_at desc);

create trigger envio_push_tocar_updated_at
  before update on public.envio_push
  for each row execute function public.tocar_updated_at();

alter table public.envio_push enable row level security;

-- Cada quien ve los suyos (la tarjeta de prueba de Perfil › Avisos los lee).
-- Nadie escribe por la API: el disparador, la función y confirmar_aviso_recibido.
create policy envio_push_propio_lectura on public.envio_push
  for select using (usuario_id = auth.uid());

-- ---------------------------------------------------------------------------
-- El disparador que manda el push
-- ---------------------------------------------------------------------------

create or replace function public.mandar_push_de_notificacion()
 returns trigger
 language plpgsql
 security definer
 set search_path to 'public', 'pg_temp', 'extensions'
as $function$
declare
  v_url   text;
  v_clave text;
begin
  if not public.parametro_booleano('push_activo')
     or not (new.tipo = 'aviso_de_prueba' or public.quiere_aviso(new.usuario_id, new.tipo, 'push')) then
    insert into public.envio_push (notificacion_id, usuario_id, estado, detalle)
    values (new.id, new.usuario_id, 'apagado',
            case when not public.parametro_booleano('push_activo')
                 then 'push_activo está apagado en la plataforma'
                 else 'La persona apagó el aviso al celular para este motivo' end);
    return new;
  end if;

  insert into public.envio_push (notificacion_id, usuario_id) values (new.id, new.usuario_id);

  select decrypted_secret into v_url
  from vault.decrypted_secrets where name = 'veciyo_url_funciones';
  select decrypted_secret into v_clave
  from vault.decrypted_secrets where name = 'veciyo_clave_servicio';

  if v_url is null or v_clave is null then
    update public.envio_push
       set estado = 'error',
           detalle = 'Faltan los secretos veciyo_url_funciones / veciyo_clave_servicio en el Vault'
     where notificacion_id = new.id;
    return new;
  end if;

  perform net.http_post(
    url     := v_url || '/functions/v1/enviar-push',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_clave
    ),
    body    := jsonb_build_object('notificacionId', new.id),
    timeout_milliseconds := public.parametro_entero('push_espera_segundos') * 1000
  );

  return new;
exception when others then
  -- Un push que no se pudo encolar no puede tumbar el aviso de la campana.
  update public.envio_push
     set estado = 'error', detalle = 'No se pudo encolar: ' || sqlerrm
   where notificacion_id = new.id;
  return new;
end;
$function$;

comment on function public.mandar_push_de_notificacion() is
  'Disparador de notificacion: anota el envío en envio_push y llama a la función enviar-push. Respeta push_activo y la preferencia por motivo; el aviso de prueba sale siempre.';

revoke execute on function public.mandar_push_de_notificacion() from public, anon, authenticated;

create trigger notificacion_mandar_push
  after insert on public.notificacion
  for each row execute function public.mandar_push_de_notificacion();

-- ---------------------------------------------------------------------------
-- El aviso de prueba y la confirmación de llegada
-- ---------------------------------------------------------------------------

create or replace function public.enviar_aviso_de_prueba()
 returns uuid
 language plpgsql
 security definer
 set search_path to 'public', 'pg_temp'
as $function$
declare
  v_yo          uuid := auth.uid();
  v_condominio  uuid;
  v_ultimo      timestamptz;
  v_espera      integer := public.parametro_entero('aviso_prueba_espera_segundos');
  v_id          uuid;
begin
  if v_yo is null then
    raise exception 'Hay que tener sesión para mandarse un aviso de prueba';
  end if;

  select max(created_at) into v_ultimo
  from public.notificacion
  where usuario_id = v_yo and tipo = 'aviso_de_prueba';

  if v_ultimo is not null and v_ultimo > now() - make_interval(secs => v_espera) then
    raise exception 'Espera unos segundos antes de mandar otro aviso de prueba';
  end if;

  -- `notificacion.condominio_id` es obligatorio: el edificio de alguna de sus
  -- membresías, la que sea (el aviso es solo para él).
  select coalesce(
    (select mc.condominio_id from public.membresia_condominio mc
      where mc.usuario_id = v_yo and mc.activo limit 1),
    (select u.condominio_id from public.membresia_unidad m
       join public.unidad u on u.id = m.unidad_id
      where m.usuario_id = v_yo and m.activo limit 1)
  ) into v_condominio;

  if v_condominio is null then
    raise exception 'Tu cuenta no pertenece a ningún edificio todavía';
  end if;

  insert into public.notificacion (usuario_id, condominio_id, tipo, titulo, mensaje)
  values (v_yo, v_condominio, 'aviso_de_prueba', 'Aviso de prueba',
          'Si ves esto en tu celular, los avisos de Veciyo te están llegando.')
  returning id into v_id;

  return v_id;
end;
$function$;

comment on function public.enviar_aviso_de_prueba() is
  'Quien llama se manda a sí mismo un aviso de prueba (campana + push). Devuelve el id de la notificación, para seguir su envío en envio_push.';

grant execute on function public.enviar_aviso_de_prueba() to authenticated;

create or replace function public.confirmar_aviso_recibido(p_notificacion_id uuid)
 returns boolean
 language plpgsql
 security definer
 set search_path to 'public', 'pg_temp'
as $function$
begin
  -- Solo el destinatario, y solo la primera vez: tocarlo después no cambia
  -- cuándo llegó.
  update public.envio_push
     set recibido_en = coalesce(recibido_en, now())
   where notificacion_id = p_notificacion_id
     and usuario_id = auth.uid();

  return found;
end;
$function$;

comment on function public.confirmar_aviso_recibido(uuid) is
  'La app dice que el push de este aviso le llegó a quien llama. Marca recibido_en la primera vez; de otro, no toca nada.';

grant execute on function public.confirmar_aviso_recibido(uuid) to authenticated;
