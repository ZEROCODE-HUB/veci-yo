-- Un huésped cuya estancia terminó ya no ve nada del edificio (09/11/2026,
-- revisión pedida por el cliente: «si la estadía de un huésped temporal
-- termina, pues obvio ya no debe salirle nada»).
--
-- Simulando a Diego (dos estancias terminadas, membresías todavía activas) se
-- comprobó tabla por tabla: no ve viviendas, visitas, paquetes, chats,
-- reservas, zonas, anuncios ni llamadas. Quedaban dos cosas:
--
-- 1. `puede_ver_perfil`, la rama «quien comparte vivienda», no miraba si la
--    estancia del huésped seguía: Diego seguía leyendo los perfiles de los
--    propietarios (nombre, teléfono). Ahora un huésped solo comparte vivienda
--    mientras dura su estancia (o antes de empezar, cuando ya está invitado).
-- 2. Los avisos de la campana: seguía viendo los 39 de sus estancias. Ahora
--    un aviso de un edificio se ve mientras se pertenece a él (o se tiene una
--    estancia en curso o por venir); los que no son de ningún edificio, siempre.
--
-- Solo aditiva: se reemplazan la función y la política de lectura.

create or replace function public.puede_ver_perfil(p_perfil_id uuid)
returns boolean
language sql stable security definer
set search_path = public, pg_temp
as $$
  select
    -- El propio, siempre y sin condiciones.
    p_perfil_id = auth.uid()

    -- Quien comparte vivienda, si esa persona lo permite en esa vivienda.
    -- El huésped, solo mientras no haya terminado su estancia (09/11/2026).
    or exists (
      select 1
      from public.membresia_unidad suya
      join public.membresia_unidad mia
        on mia.unidad_id = suya.unidad_id
      where suya.usuario_id = p_perfil_id
        and suya.activo
        and suya.datos_visibles
        and mia.usuario_id = auth.uid()
        and mia.activo
        and (mia.rol <> 'huesped_temporal'
             or mia.vigente_hasta is null
             or mia.vigente_hasta >= public.hoy_en_la_unidad(mia.unidad_id))
    )

    -- La porteria y la administracion del condominio donde vive esa persona.
    or exists (
      select 1
      from public.membresia_unidad suya
      join public.unidad u on u.id = suya.unidad_id
      where suya.usuario_id = p_perfil_id
        and suya.activo
        and public.es_personal_condominio(u.condominio_id)
    );
$$;

drop policy if exists notificacion_propia_lectura on public.notificacion;
create policy notificacion_propia_lectura on public.notificacion
  for select
  using (
    usuario_id = auth.uid()
    and (
      condominio_id is null
      or public.es_miembro_condominio(condominio_id)
      or public.es_huesped_del_condominio(condominio_id)
    )
  );

comment on policy notificacion_propia_lectura on public.notificacion is
  'Los avisos propios, mientras se pertenece al edificio del aviso (o se tiene una estancia en curso o por venir). Los que no son de ningún edificio, siempre (09/11/2026).';
