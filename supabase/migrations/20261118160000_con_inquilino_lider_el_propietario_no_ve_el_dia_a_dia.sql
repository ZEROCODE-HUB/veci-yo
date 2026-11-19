-- ============================================================================
-- Con inquilino líder, el propietario no ve el día a día (18/11/2026)
-- ============================================================================
-- Pedido del cliente: cuando la vivienda tiene inquilino líder, quien vive y
-- manda ahí es él. El propietario sigue gestionando la vivienda (invitar,
-- anfitriones, renta corta), ve anuncios, cuadro de honor, grupos y chats,
-- pero **no** la correspondencia, las visitas ni las reservas de zonas
-- comunes de esa vivienda, ni le llegan sus avisos.
--
-- Cambia la decisión del 09/11/2026 (Correcciones fila 10: el propietario no
-- residente lo veía todo) solo para el caso con inquilino líder.
--
-- La administración y la portería no cambian: entran por sus ramas. Quien
-- además administra el edificio lo sigue viendo como administración (regla 8).
--
-- Solo aditiva: una función nueva, cuatro políticas con la misma condición
-- que tenían salvo esa pieza, y cuatro funciones con su cuerpo de hoy.

create or replace function public.ve_el_dia_a_dia(p_unidad_id uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
  select exists (
    select 1 from public.membresia_unidad mu
    where mu.unidad_id = p_unidad_id
      and mu.usuario_id = auth.uid()
      and mu.activo
      and mu.rol <> 'huesped_temporal'
      and (mu.rol <> 'propietario'
           or not public.hay_inquilino_lider_activo(p_unidad_id)
           -- Con la renta corta en marcha nadie vive ahí y el propietario es
           -- anfitrión: sigue viendo las estancias y lo que llega.
           or public.renta_corta_en_marcha(p_unidad_id))
  );
$$;
comment on function public.ve_el_dia_a_dia(uuid) is
  'Si quien llama ve el día a día de la vivienda (correspondencia, visitas, reservas): es miembro, no huésped, y si es propietario, la vivienda no tiene inquilino líder (18/11/2026).';
revoke execute on function public.ve_el_dia_a_dia(uuid) from public, anon;
grant execute on function public.ve_el_dia_a_dia(uuid) to authenticated, service_role;

alter policy correspondencia_lectura on public.correspondencia
  using (public.ve_el_dia_a_dia(unidad_id)
         or public.es_guardia_de_condominio(public.condominio_de_unidad(unidad_id))
         or public.puede_coadmin(public.condominio_de_unidad(unidad_id), 'visualizarCorrespondencia')
         or (huesped_id = auth.uid() and public.es_huesped_alojado(unidad_id)));

alter policy visita_lectura on public.visita
  using (((unidad_id is not null) and public.ve_el_dia_a_dia(unidad_id))
         or ((registrada_por = auth.uid()) and (unidad_id is not null) and public.es_huesped_con_reserva(unidad_id))
         or (public.es_guardia_de_condominio(condominio_id)
             and public.visita_en_ventana_de_porteria(condominio_id, fecha_desde, fecha_hasta, estado, tipo, created_at, registrada_por))
         or public.puede_coadmin(condominio_id, 'visualizarVisitas'));

alter policy reserva_zona_lectura on public.reserva_zona
  using (public.ve_el_dia_a_dia(unidad_id)
         or exists (select 1 from public.zona_comun z
                    where z.id = reserva_zona.zona_id
                      and public.puede_coadmin(z.condominio_id, 'visualizarZonasComunes')));

alter policy participante_reserva_acceso on public.participante_reserva
  using (exists (select 1 from public.reserva_zona r
                 where r.id = participante_reserva.reserva_id
                   and (public.ve_el_dia_a_dia(r.unidad_id)
                        or public.es_admin_condominio(public.condominio_de_unidad(r.unidad_id)))))
  with check (exists (select 1 from public.reserva_zona r
                      where r.id = participante_reserva.reserva_id
                        and (public.ve_el_dia_a_dia(r.unidad_id)
                             or public.es_admin_condominio(public.condominio_de_unidad(r.unidad_id)))));

CREATE OR REPLACE FUNCTION public.puede_ver_visita(p_visita_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  select exists (
    select 1 from public.visita v
    where v.id = p_visita_id
      and (
        (
          public.es_guardia_de_condominio(v.condominio_id)
          and public.visita_en_ventana_de_porteria(
                v.condominio_id, v.fecha_desde, v.fecha_hasta,
                v.estado, v.tipo, v.created_at, v.registrada_por)
        )
        or public.puede_coadmin(v.condominio_id, 'visualizarVisitas')
        /*
          `es_miembro_unidad` y no `puede_operar_unidad`, que era lo que habia:
          esa incluye a todo el personal del edificio, guardia incluido, asi
          que por aqui volvia a entrar sin fecha lo que la rama de arriba
          acaba de cerrar. Lo delato la prueba, no la lectura. El personal ya
          esta arriba; aqui quedan los de la vivienda.
        */
        or (v.unidad_id is not null and public.ve_el_dia_a_dia(v.unidad_id))
        -- Lo suyo, y solo lo suyo: la visita que él registró.
        or (
          v.registrada_por = auth.uid()
          and v.unidad_id is not null
          and public.es_huesped_con_reserva(v.unidad_id)
        )
        -- El profesional permanente con permiso de crear visitas (18/11/2026):
        -- las que él registró, y nada más de la vivienda.
        or (
          v.registrada_por = auth.uid()
          and v.unidad_id is not null
          and public.trabajador_registra_visitas(v.unidad_id)
        )
      )
  );
$function$;

CREATE OR REPLACE FUNCTION public.puede_ver_reserva(p_reserva_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  select exists (
    select 1
    from public.reserva_zona r
    join public.zona_comun z on z.id = r.zona_id
    where r.id = p_reserva_id
      and (
        public.ve_el_dia_a_dia(r.unidad_id)
        or public.puede_coadmin(z.condominio_id, 'visualizarZonasComunes')
        -- El huesped reserva a su nombre y tiene que poder adjuntar el suyo.
        or r.solicitada_por = auth.uid()
        -- La portería de ese edificio (29/10/2026).
        or public.es_guardia_de_condominio(z.condominio_id)
      )
  );
$function$;

CREATE OR REPLACE FUNCTION public.nombres_de_correspondencia(p_ids uuid[])
 RETURNS TABLE(correspondencia_id uuid, registrada_por text, recibida_por text, notificada_por text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  select
    c.id,
    nullif(btrim(coalesce(pr.nombre, '') || ' ' || coalesce(pr.apellido, '')), ''),
    nullif(btrim(coalesce(pc.nombre, '') || ' ' || coalesce(pc.apellido, '')), ''),
    nullif(btrim(coalesce(pn.nombre, '') || ' ' || coalesce(pn.apellido, '')), '')
  from public.correspondencia c
  left join public.perfil pr on pr.id = c.registrada_por
  left join public.perfil pc on pc.id = c.recibida_por
  left join public.perfil pn on pn.id = c.notificada_otro_medio_por
  where c.id = any(p_ids)
    and (
      public.ve_el_dia_a_dia(c.unidad_id)
      or public.es_guardia_de_condominio(public.condominio_de_unidad(c.unidad_id))
      or public.puede_coadmin(public.condominio_de_unidad(c.unidad_id), 'visualizarCorrespondencia')
      or (c.huesped_id = auth.uid() and public.es_huesped_alojado(c.unidad_id))
    );
$function$;

CREATE OR REPLACE FUNCTION public.notificar_unidad(p_unidad_id uuid, p_tipo motivo_notificacion, p_titulo text, p_mensaje text, p_entidad_tipo text DEFAULT NULL::text, p_entidad_id uuid DEFAULT NULL::uuid, p_excepto uuid DEFAULT NULL::uuid, p_solo_residentes boolean DEFAULT false)
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
    -- Con inquilino líder, al propietario no le llega el día a día de la
    -- vivienda: paquetes, visitas, reservas (18/11/2026, pedido del cliente).
    and not (m.rol = 'propietario'
             and p_tipo in ('correspondencia_recibida', 'correspondencia_entregada',
                            'correspondencia_incidencia', 'visita_ingreso',
                            'reserva_aprobada', 'reserva_rechazada', 'reserva_creada',
                            'reserva_cambiada', 'reserva_cancelada', 'reserva_por_aprobar')
             and public.hay_inquilino_lider_activo(p_unidad_id))
    -- Quien apagó este motivo en la campana no recibe la fila.
    and public.quiere_aviso(m.usuario_id, p_tipo, 'app');
$function$;
