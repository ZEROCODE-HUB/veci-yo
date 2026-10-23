-- Al huésped se le avisa de su paquete solo mientras sigue alojado.
--
-- QA 23/10/2026 (fila 89): Tomás recibió el aviso de una novedad con un
-- paquete del 22/10, pero en la campana no aparecía nada. El paquete se le
-- asignó cuando estaba alojado; hoy su estancia ya no estaba activa, así que el
-- aviso salía al teléfono y la campana --que muestra lo de los edificios donde
-- la persona tiene acceso-- no lo enseñaba. Un aviso que llega y no se puede
-- abrir es peor que ninguno: se avisa solo a quien sigue alojado en esa
-- vivienda. La correspondencia de la vivienda sigue avisando al propietario.

create or replace function public.avisar_al_huesped_del_paquete(
  p_huesped_id uuid, p_unidad_id uuid, p_tipo public.motivo_notificacion,
  p_titulo text, p_mensaje text, p_paquete_id uuid, p_excepto uuid)
returns void
language sql
security definer
set search_path to 'public', 'pg_temp'
as $$
  insert into public.notificacion
    (usuario_id, condominio_id, tipo, titulo, mensaje, entidad_tipo, entidad_id)
  select p_huesped_id, u.condominio_id, p_tipo, p_titulo, p_mensaje,
         'correspondencia', p_paquete_id
  from public.unidad u
  where u.id = p_unidad_id
    and p_huesped_id is not null
    and (p_excepto is null or p_huesped_id <> p_excepto)
    and public.quiere_aviso(p_huesped_id, p_tipo, 'app')
    and exists (
      select 1 from public.membresia_unidad m
      where m.usuario_id = p_huesped_id
        and m.unidad_id = p_unidad_id
        and m.rol = 'huesped_temporal'
        and m.activo
        and (m.vigente_desde is null or m.vigente_desde <= current_date)
        and (m.vigente_hasta is null or m.vigente_hasta >= current_date)
    );
$$;

comment on function public.avisar_al_huesped_del_paquete(uuid, uuid, public.motivo_notificacion, text, text, uuid, uuid) is
  'Avisa al huésped de su paquete, solo mientras sigue alojado en esa vivienda.';
