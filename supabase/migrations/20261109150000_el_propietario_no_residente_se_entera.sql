-- El propietario que no vive en su vivienda también recibe los avisos de la
-- vivienda (09/11/2026, Correcciones fila 10: «El propietario No Residente,
-- al ingresar a Viviendas, no sale la opción de Zonas Comunes, ni tampoco
-- Correspondencia.. debería mostrarse»; el usuario eligió «secciones y
-- avisos»).
--
-- Desde el hueco 29 (15/10/2026) `notificar_unidad(..., p_solo_residentes)`
-- dejaba fuera al huésped y al dueño que no reside. Ahora solo deja fuera al
-- huésped: los paquetes, las incidencias de correspondencia, las entradas de
-- visitas y las reservas de zonas de su vivienda le llegan al propietario
-- aunque no viva allí. El huésped sigue recibiendo solo lo suyo
-- (`avisar_al_huesped_del_paquete`, las reservas a su nombre). Solo aditiva.

create or replace function public.notificar_unidad(p_unidad_id uuid, p_tipo motivo_notificacion, p_titulo text, p_mensaje text, p_entidad_tipo text DEFAULT NULL::text, p_entidad_id uuid DEFAULT NULL::uuid, p_excepto uuid DEFAULT NULL::uuid, p_solo_residentes boolean DEFAULT false)
 RETURNS void
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  insert into public.notificacion
    (usuario_id, condominio_id, tipo, titulo, mensaje, entidad_tipo, entidad_id)
  select distinct m.usuario_id, u.condominio_id, p_tipo, p_titulo, p_mensaje,
         p_entidad_tipo, p_entidad_id
  from public.membresia_unidad m
  join public.unidad u on u.id = m.unidad_id
  where m.unidad_id = p_unidad_id
    and m.activo
    and m.puede_acceder
    and m.usuario_id is not null
    -- Solo quien está en la vivienda hoy: no el huésped que ya se fue ni el que
    -- todavía no llegó (15/10/2026).
    and (m.vigente_desde is null or m.vigente_desde <= public.hoy_en_el_edificio(u.condominio_id))
    and (m.vigente_hasta is null or m.vigente_hasta >= public.hoy_en_el_edificio(u.condominio_id))
    and (p_excepto is null or m.usuario_id <> p_excepto)
    -- La gente de la vivienda: quien vive allí y el propietario aunque no
    -- resida (09/11/2026, Correcciones fila 10; antes, hueco 29, el dueño que
    -- no reside quedaba fuera). El huésped no: lo suyo le llega aparte.
    and (not p_solo_residentes
         or (m.rol <> 'huesped_temporal' and (m.es_residente or m.rol = 'propietario')))
    -- Quien apagó este motivo en la campana no recibe la fila.
    and public.quiere_aviso(m.usuario_id, p_tipo, 'app');
$function$;
