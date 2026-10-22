-- Los avisos de la campana NO salen por correo (22/10/2026).
--
-- La migración anterior (20261022120000) montó el envío de cada aviso por
-- correo. El cliente lo descartó minutos después, antes de que saliera ningún
-- correo: «¿todas las cosas se enviarán por correo? Mejor no. Quita el
-- interruptor por correo, que solo lo importante se envíe: invitaciones,
-- recuperación de contraseña, algún recordatorio». Esos ya salen por
-- `enviar-correo` y por Supabase Auth, y no cambian.
--
-- Aquí se quita el disparador y su función (la función de servidor
-- `enviar-aviso-por-correo` se borró a mano el mismo día). La tabla
-- `envio_correo`, `perfil.avisos_correo` y sus parámetros se quedan, vacíos y
-- marcados «[Sin uso]»: la regla es no borrar tablas, y si algún día se quiere
-- el correo de los avisos, la mitad está hecha.

drop trigger if exists notificacion_mandar_correo on public.notificacion;
drop function if exists public.mandar_correo_de_notificacion();

create or replace function public.quiere_aviso(p_usuario_id uuid, p_motivo motivo_notificacion, p_canal text)
 returns boolean
 language sql
 stable security definer
 set search_path to 'public', 'pg_temp'
as $function$
  select case
    -- La alarma de panico va siempre y por todo lo que haya.
    when p_motivo = 'sos_activado' then true
    -- El interruptor general de push (22/10/2026) manda por encima de todo.
    when p_canal = 'push' and not coalesce(
      (select pf.avisos_push from public.perfil pf where pf.id = p_usuario_id), true) then false
    -- Los avisos no salen por correo ni por WhatsApp (decisión del 22/10/2026).
    when p_canal in ('correo', 'whatsapp') then false
    -- Sin el detalle por motivo (oculto por defecto), basta el interruptor.
    when not public.parametro_booleano('avisos_por_motivo') then p_canal in ('app', 'push')
    when p_canal = 'app' then coalesce(
      (select p.por_app from public.preferencia_aviso p
       where p.usuario_id = p_usuario_id and p.motivo = p_motivo), public.parametro_booleano('avisos_app_por_defecto'))
    when p_canal = 'push' then coalesce(
      (select p.por_push from public.preferencia_aviso p
       where p.usuario_id = p_usuario_id and p.motivo = p_motivo), public.parametro_booleano('avisos_push_por_defecto'))
    -- Un canal que no existe no recibe nada.
    else false
  end;
$function$;

comment on function public.quiere_aviso(uuid, motivo_notificacion, text) is
  'Si a esta persona le llega este motivo por este canal. app (campana) y push: interruptor general de push y, solo si avisos_por_motivo está encendido, la preferencia por motivo. correo y whatsapp: nunca (los avisos no salen por ahí). La alarma de S.O.S., siempre.';

comment on table public.envio_correo is
  '[Sin uso] Iba a anotar el correo de cada aviso; el cliente decidió el 22/10/2026 que los avisos no salen por correo. Vacía. Ver la migración 20261022121000.';
comment on column public.perfil.avisos_correo is
  '[Sin uso] Interruptor general de avisos por correo; los avisos no salen por correo (decisión del 22/10/2026).';

update public.configuracion_plataforma
   set descripcion = '[Sin uso] ' || descripcion
 where clave in ('correo_dominios_sin_envio', 'correo_aviso_espera_segundos')
   and descripcion not like '[Sin uso]%';
