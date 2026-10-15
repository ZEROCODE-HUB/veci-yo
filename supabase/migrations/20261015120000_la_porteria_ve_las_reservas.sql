-- La portería ve las reservas de las zonas comunes de su edificio (15/10/2026).
--
-- El cliente, entrando como guardia: «en Zonas comunes el guardia debería ver
-- las reservas». La pantalla ya le pintaba la lista, pero salía vacía siempre:
-- `reserva_zona_lectura` solo deja leer a quien vive en la vivienda y a la
-- administración, y la portería no estaba. Tampoco veía quién la pidió
-- (`solicitantes_de_reservas`) ni podía marcar quién llegó o editar los nombres
-- (`participante_reserva`).
--
-- Solo se añade: lectura de las reservas y de quién las pidió, y lectura y
-- cambio de sus personas, siempre del edificio donde está de portería. No
-- puede crear, aprobar ni cancelar reservas.

create policy reserva_zona_porteria_lectura on public.reserva_zona
  for select to authenticated
  using (exists (
    select 1 from public.zona_comun z
    where z.id = reserva_zona.zona_id and public.es_guardia_de_condominio(z.condominio_id)
  ));

create policy participante_reserva_porteria_lectura on public.participante_reserva
  for select to authenticated
  using (exists (
    select 1 from public.reserva_zona r
    join public.zona_comun z on z.id = r.zona_id
    where r.id = participante_reserva.reserva_id
      and public.es_guardia_de_condominio(z.condominio_id)
  ));

create policy participante_reserva_porteria_cambio on public.participante_reserva
  for update to authenticated
  using (exists (
    select 1 from public.reserva_zona r
    join public.zona_comun z on z.id = r.zona_id
    where r.id = participante_reserva.reserva_id
      and public.es_guardia_de_condominio(z.condominio_id)
  ))
  with check (exists (
    select 1 from public.reserva_zona r
    join public.zona_comun z on z.id = r.zona_id
    where r.id = participante_reserva.reserva_id
      and public.es_guardia_de_condominio(z.condominio_id)
  ));

CREATE OR REPLACE FUNCTION public.solicitantes_de_reservas(p_reservas uuid[])
 RETURNS TABLE(reserva_id uuid, solicitante text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  select
    r.id,
    coalesce(
      -- Si pidio figurar con alias en las zonas, el nombre real no sale.
      case when p.usa_alias_zonas then nullif(p.alias, '') end,
      nullif(btrim(coalesce(p.nombre, '') || ' ' || coalesce(p.apellido, '')), ''),
      m.nombre
    )
  from public.reserva_zona r
  left join public.perfil p on p.id = r.solicitada_por
  left join public.membresia_unidad m
         on m.unidad_id = r.unidad_id
        and m.usuario_id = r.solicitada_por
        and m.activo
  where r.id = any(p_reservas)
    -- La misma visibilidad que la politica de la tabla: quien opera la
    -- vivienda, la administracion del condominio, y el huesped sobre la suya.
    and (
      public.puede_operar_unidad(r.unidad_id)
      or exists (
        select 1 from public.zona_comun z
        where z.id = r.zona_id and public.es_admin_condominio(z.condominio_id)
      )
      or (r.solicitada_por = auth.uid())
      -- Y la portería de ese edificio (15/10/2026).
      or exists (
        select 1 from public.zona_comun z
        where z.id = r.zona_id and public.es_guardia_de_condominio(z.condominio_id)
      )
    );
$function$;
