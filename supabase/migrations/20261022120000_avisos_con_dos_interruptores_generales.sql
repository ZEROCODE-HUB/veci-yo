-- Avisos: dos interruptores generales (push y correo), encendidos por defecto,
-- y los avisos por correo de verdad (22/10/2026).
--
-- Pedido del cliente: «quiero que todos los permisos por defecto sean
-- activados, y que en configuraciones el usuario pueda desactivar o activar el
-- correo y notificaciones push, pero en general, no uno por uno. Tampoco
-- elimines estos cambios ya que a futuro capaz sí quieran: ocúltalo». Y: «no
-- nos vamos a integrar con WhatsApp».
--
-- Así queda:
--   · perfil.avisos_push y perfil.avisos_correo: los dos interruptores, por
--     persona, encendidos por defecto.
--   · El detalle por motivo (preferencia_aviso) sigue entero, pero solo cuenta
--     si `avisos_por_motivo` está encendido (apagado por defecto: oculto). Así
--     una preferencia vieja que nadie ve no apaga un aviso a escondidas.
--   · WhatsApp no se ofrece (`avisos_whatsapp_visible`, apagado).
--   · Hasta hoy **ningún aviso salía por correo** (solo invitaciones y
--     recordatorios): un disparador anota cada envío en `envio_correo` y la
--     función `enviar-aviso-por-correo` lo manda por Resend.
-- Aditiva.

insert into public.configuracion_plataforma
  (clave, valor, valor_por_defecto, tipo, unidad, minimo, maximo, ambito, categoria, riesgo, es_publico, valores_permitidos, descripcion)
values
  ('avisos_por_motivo', 'false', 'false', 'booleano', null, null, null, 'plataforma', 'avisos', 'bajo', true, null,
   'Si cada persona puede elegir aviso por aviso (campana, push, correo) en Perfil › Configuración. Apagado: solo los dos interruptores generales, y las preferencias por motivo guardadas no cuentan.'),
  ('avisos_whatsapp_visible', 'false', 'false', 'booleano', null, null, null, 'plataforma', 'avisos', 'bajo', true, null,
   'Si se ofrece WhatsApp como canal en la lista por motivo. No hay integración con WhatsApp: dejarlo apagado.'),
  ('correo_dominios_sin_envio', '["veciyo.test", "example.com"]', '["veciyo.test", "example.com"]', 'lista', null, null, null, 'plataforma', 'avisos', 'medio', false, null,
   'Dominios de correo a los que nunca se mandan avisos (cuentas de prueba que no existen). Mandarles hace rebotar el correo y daña la reputación del remitente.'),
  ('correo_aviso_espera_segundos', '15', '15', 'segundos', 'segundos', 5, 60, 'plataforma', 'avisos', 'bajo', false, null,
   'Segundos que se espera al mandar un aviso por correo antes de darlo por fallido.')
on conflict (clave) do nothing;

alter table public.perfil
  add column if not exists avisos_push boolean not null default true,
  add column if not exists avisos_correo boolean not null default true;

comment on column public.perfil.avisos_push is
  'Interruptor general: si a esta persona le llegan avisos push al celular. Lo cambia ella en Perfil › Configuración. La alarma de S.O.S. llega igual.';
comment on column public.perfil.avisos_correo is
  'Interruptor general: si a esta persona le llegan los avisos por correo. Lo cambia ella en Perfil › Configuración. La alarma de S.O.S. llega igual.';

create or replace function public.quiere_aviso(p_usuario_id uuid, p_motivo motivo_notificacion, p_canal text)
 returns boolean
 language sql
 stable security definer
 set search_path to 'public', 'pg_temp'
as $function$
  select case
    -- La alarma de panico va siempre y por todo lo que haya.
    when p_motivo = 'sos_activado' then true
    -- Los interruptores generales (22/10/2026) mandan por encima de todo.
    when p_canal = 'push' and not coalesce(
      (select pf.avisos_push from public.perfil pf where pf.id = p_usuario_id), true) then false
    when p_canal = 'correo' and not coalesce(
      (select pf.avisos_correo from public.perfil pf where pf.id = p_usuario_id), true) then false
    -- Sin el detalle por motivo (oculto por defecto), basta el interruptor.
    -- WhatsApp no existe como canal.
    when not public.parametro_booleano('avisos_por_motivo') then p_canal in ('app', 'push', 'correo')
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

-- ---------------------------------------------------------------------------
-- El registro de cada aviso por correo
-- ---------------------------------------------------------------------------

create type public.estado_envio_correo as enum (
  'pendiente',  -- anotado, la función todavía no respondió
  'enviado',    -- Resend lo aceptó
  'sin_correo', -- la persona no tiene un correo al que se pueda mandar (o es de prueba)
  'apagado',    -- la persona apagó los avisos por correo
  'error'       -- falló: el motivo va en `detalle`
);

comment on type public.estado_envio_correo is 'En qué quedó el correo de un aviso de la campana.';

create table public.envio_correo (
  id              uuid primary key default gen_random_uuid(),
  notificacion_id uuid not null unique references public.notificacion(id) on delete cascade,
  usuario_id      uuid not null references auth.users(id) on delete cascade,
  estado          public.estado_envio_correo not null default 'pendiente',
  destino         text,
  proveedor_id    text,
  detalle         text,
  enviado_en      timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

comment on table public.envio_correo is
  'Un correo por aviso de la campana: si salió y, si no, por qué. Lo escriben el disparador de notificacion y la función enviar-aviso-por-correo.';
comment on column public.envio_correo.id is 'Identificador del envío.';
comment on column public.envio_correo.notificacion_id is 'El aviso de la campana que se mandó por correo.';
comment on column public.envio_correo.usuario_id is 'A quién va (el mismo de la notificación).';
comment on column public.envio_correo.estado is 'En qué quedó: pendiente, enviado, sin_correo, apagado o error.';
comment on column public.envio_correo.destino is 'La dirección a la que se mandó (la de la cuenta, o la alternativa si la persona la eligió).';
comment on column public.envio_correo.proveedor_id is 'El identificador que Resend le dio al correo, para buscarlo en su panel.';
comment on column public.envio_correo.detalle is 'Por qué no salió, o la respuesta del proveedor si algo fue raro.';
comment on column public.envio_correo.enviado_en is 'Cuándo lo aceptó Resend.';
comment on column public.envio_correo.created_at is 'Cuándo se anotó.';
comment on column public.envio_correo.updated_at is 'Última vez que cambió.';

create index envio_correo_usuario_idx on public.envio_correo (usuario_id, created_at desc);

create trigger envio_correo_tocar_updated_at
  before update on public.envio_correo
  for each row execute function public.tocar_updated_at();

alter table public.envio_correo enable row level security;

create policy envio_correo_propio_lectura on public.envio_correo
  for select using (usuario_id = auth.uid());

create or replace function public.mandar_correo_de_notificacion()
 returns trigger
 language plpgsql
 security definer
 set search_path to 'public', 'pg_temp', 'extensions'
as $function$
declare
  v_url   text;
  v_clave text;
begin
  -- «Veciyo se actualizó» es de la app del celular: por correo sería ruido.
  if new.tipo = 'app_actualizada' then
    return new;
  end if;

  if not public.quiere_aviso(new.usuario_id, new.tipo, 'correo') then
    insert into public.envio_correo (notificacion_id, usuario_id, estado, detalle)
    values (new.id, new.usuario_id, 'apagado', 'La persona apagó los avisos por correo');
    return new;
  end if;

  insert into public.envio_correo (notificacion_id, usuario_id) values (new.id, new.usuario_id);

  select decrypted_secret into v_url
  from vault.decrypted_secrets where name = 'veciyo_url_funciones';
  select decrypted_secret into v_clave
  from vault.decrypted_secrets where name = 'veciyo_clave_servicio';

  if v_url is null or v_clave is null then
    update public.envio_correo
       set estado = 'error',
           detalle = 'Faltan los secretos veciyo_url_funciones / veciyo_clave_servicio en el Vault'
     where notificacion_id = new.id;
    return new;
  end if;

  perform net.http_post(
    url     := v_url || '/functions/v1/enviar-aviso-por-correo',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_clave
    ),
    body    := jsonb_build_object('notificacionId', new.id),
    timeout_milliseconds := public.parametro_entero('correo_aviso_espera_segundos') * 1000
  );

  return new;
exception when others then
  -- Un correo que no se pudo encolar no puede tumbar el aviso de la campana.
  update public.envio_correo
     set estado = 'error', detalle = 'No se pudo encolar: ' || sqlerrm
   where notificacion_id = new.id;
  return new;
end;
$function$;

comment on function public.mandar_correo_de_notificacion() is
  'Disparador de notificacion: anota el envío en envio_correo y llama a la función enviar-aviso-por-correo. Respeta el interruptor general de correo (y el detalle por motivo si avisos_por_motivo está encendido).';

revoke execute on function public.mandar_correo_de_notificacion() from public, anon, authenticated;

create trigger notificacion_mandar_correo
  after insert on public.notificacion
  for each row execute function public.mandar_correo_de_notificacion();
