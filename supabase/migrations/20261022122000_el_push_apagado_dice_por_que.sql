-- Cuando un push no sale porque la persona lo apagó, decir cuál de los dos
-- interruptores fue (22/10/2026): desde hoy hay uno general
-- (perfil.avisos_push) y el detalle por motivo está oculto.

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
            case
              when not public.parametro_booleano('push_activo')
                then 'push_activo está apagado en la plataforma'
              when not coalesce((select pf.avisos_push from public.perfil pf where pf.id = new.usuario_id), true)
                then 'La persona apagó las notificaciones push'
              else 'La persona apagó este aviso en la lista aviso por aviso'
            end);
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
