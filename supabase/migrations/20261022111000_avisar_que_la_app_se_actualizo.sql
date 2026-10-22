-- Avisar a todos que la app se actualizó (22/10/2026).
--
-- Pedido del cliente: «ni bien se publique un OTA, a todos los dispositivos se
-- envíe una notificación push indicando el número de versión nuevo, para que
-- los testers ya sepan que se actualizó».
--
-- La llama `scripts/publicar-ota.mjs` con la clave de servicio justo después de
-- publicar. Crea un aviso «app_actualizada» por persona y el disparador de
-- siempre lo manda como push (respeta la preferencia «En el celular» de ese
-- motivo, como cualquier otro). Aditiva.

insert into public.configuracion_plataforma
  (clave, valor, valor_por_defecto, tipo, unidad, minimo, maximo, ambito, categoria, riesgo, es_publico, valores_permitidos, descripcion)
values
  ('avisar_actualizaciones', 'true', 'true', 'booleano', null, null, null, 'plataforma', 'avisos', 'bajo', false, null,
   'Si al publicar una actualización de la app (OTA) se avisa a todos con un aviso y un push que dice el número de actualización.')
on conflict (clave) do nothing;

create or replace function public.avisar_app_actualizada(p_numero integer, p_novedad text default null)
 returns integer
 language plpgsql
 security definer
 set search_path to 'public', 'pg_temp'
as $function$
declare
  v_cuantos integer;
begin
  if not public.parametro_booleano('avisar_actualizaciones') then
    return 0;
  end if;

  -- Una fila por persona con alguna membresía activa, en el edificio de la
  -- primera que tenga (notificacion.condominio_id es obligatorio).
  insert into public.notificacion (usuario_id, condominio_id, tipo, titulo, mensaje)
  select distinct on (quien.usuario_id)
         quien.usuario_id, quien.condominio_id, 'app_actualizada',
         format('Veciyo se actualizó (actualización %s)', p_numero),
         coalesce(nullif(trim(p_novedad), ''), 'Hay una versión nueva de la app.')
           || ' Toca este aviso o cierra y abre la app para tenerla.'
  from (
    select mc.usuario_id, mc.condominio_id
    from public.membresia_condominio mc
    where mc.activo and mc.usuario_id is not null
    union all
    select m.usuario_id, u.condominio_id
    from public.membresia_unidad m
    join public.unidad u on u.id = m.unidad_id
    where m.activo and m.usuario_id is not null
  ) quien
  order by quien.usuario_id;

  get diagnostics v_cuantos = row_count;
  return v_cuantos;
end;
$function$;

comment on function public.avisar_app_actualizada(integer, text) is
  'Avisa a todos (campana + push) que se publicó la actualización número p_numero de la app, con una novedad. Solo la clave de servicio (scripts/publicar-ota.mjs). Devuelve a cuántas personas avisó; 0 si avisar_actualizaciones está apagado.';

revoke execute on function public.avisar_app_actualizada(integer, text) from public, anon, authenticated;
grant execute on function public.avisar_app_actualizada(integer, text) to service_role;
