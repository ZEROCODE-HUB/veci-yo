-- ----------------------------------------------------------------------------
-- Los avisos de paquetes, para quien vive allí (15/10/2026, huecos 29 y 27)
-- ----------------------------------------------------------------------------
-- Hueco 29. Al dueño que no vive en la vivienda la app le oculta la
-- correspondencia y las zonas comunes --son de quien vive allí-- y aun así le
-- llegaban los avisos de los dos: «llegó un paquete» de un módulo que no
-- puede abrir. `p_solo_residentes` dejaba fuera al huésped y a nadie más.
--
-- Ahora deja fuera también a quien figura como no residente
-- (`es_residente = false`). Es lo que dice su nombre, y la usan justo los dos
-- módulos que se le ocultan: la correspondencia y las reservas de zonas. Las
-- visitas no la usan --el dueño que no vive allí es el anfitrión típico, y sus
-- avisos le tocan--.
--
-- Hueco 27. Una novedad con un paquete --llegó roto, mojado, abierto-- se
-- anotaba y la vivienda no se enteraba hasta abrir el módulo. Ahora le llega
-- el aviso, a quien vive allí y no a quien la anotó.

create or replace function public.notificar_unidad(
  p_unidad_id uuid,
  p_tipo public.motivo_notificacion,
  p_titulo text,
  p_mensaje text,
  p_entidad_tipo text default null,
  p_entidad_id uuid default null,
  p_excepto uuid default null,
  p_solo_residentes boolean default false
)
returns void
language sql
security definer
set search_path = public, pg_temp
as $function$
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
    and (m.vigente_desde is null or m.vigente_desde <= current_date)
    and (m.vigente_hasta is null or m.vigente_hasta >= current_date)
    and (p_excepto is null or m.usuario_id <> p_excepto)
    -- Solo quien vive allí: ni el huésped ni el dueño que no reside (hueco 29).
    and (not p_solo_residentes or (m.rol <> 'huesped_temporal' and m.es_residente))
    -- Quien apagó este motivo en la campana no recibe la fila.
    and public.quiere_aviso(m.usuario_id, p_tipo, 'app');
$function$;

-- ----------------------------------------------------------------------------
-- La novedad con un paquete avisa
-- ----------------------------------------------------------------------------

create or replace function public.notificar_incidencia_correspondencia()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare
  v_unidad  uuid;
  v_empresa text;
begin
  select c.unidad_id, c.empresa into v_unidad, v_empresa
  from public.correspondencia c
  where c.id = new.correspondencia_id;

  if v_unidad is null then
    return new;
  end if;

  perform public.notificar_unidad(
    v_unidad, 'correspondencia_incidencia',
    'Novedad con tu paquete',
    coalesce(v_empresa, 'Un paquete') || ': ' || left(new.descripcion, 140),
    'correspondencia', new.correspondencia_id,
    -- Quien la anotó ya lo sabe.
    new.reportada_por,
    true);

  return new;
end;
$fn$;

comment on function public.notificar_incidencia_correspondencia() is
  'Avisa a quien vive en la vivienda de una novedad con su paquete (hueco 27). No a quien la anotó.';

revoke all on function public.notificar_incidencia_correspondencia() from public;

drop trigger if exists incidencia_correspondencia_notificar on public.incidencia_correspondencia;
create trigger incidencia_correspondencia_notificar
  after insert on public.incidencia_correspondencia
  for each row execute function public.notificar_incidencia_correspondencia();
