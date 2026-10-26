-- El aviso de pago de un servicio le llega a quien vive en la vivienda
-- (hueco 12).
--
-- El cliente, al ver que el aviso iba al anfitrión: «¿acaso eso no le sale al
-- que vive en la propiedad? ¿Por qué al anfitrión?». Desde el 25/10/2026 los
-- avisos salían con `notificar_anfitrion`: al propietario y al inquilino
-- líder, vivieran o no ahí, y nunca a un residente o corresidente.
--
-- Ahora le llega a cada persona que vive en ella (`es_residente`), sea cual
-- sea su papel; nunca a un huésped temporal (la luz no la paga él) ni a un
-- propietario que declaró que no reside.
--
-- Solo aditiva: una función nueva y el cuerpo de la tarea.

create or replace function public.notificar_a_quien_vive(
  p_unidad_id uuid,
  p_tipo public.motivo_notificacion,
  p_titulo text,
  p_mensaje text,
  p_entidad_tipo text default null,
  p_entidad_id uuid default null
) returns void
language sql
security definer
set search_path to 'public', 'pg_temp'
as $$
  insert into public.notificacion
    (usuario_id, condominio_id, tipo, titulo, mensaje, entidad_tipo, entidad_id)
  select distinct m.usuario_id, u.condominio_id, p_tipo, p_titulo, p_mensaje,
         p_entidad_tipo, p_entidad_id
  from public.membresia_unidad m
  join public.unidad u on u.id = m.unidad_id
  where m.unidad_id = p_unidad_id
    and m.activo
    and m.usuario_id is not null
    and m.rol <> 'huesped_temporal'
    and coalesce(m.es_residente, false)
    and public.quiere_aviso(m.usuario_id, p_tipo, 'app');
$$;

comment on function public.notificar_a_quien_vive(uuid, public.motivo_notificacion, text, text, text, uuid) is
  'Avisa a cada persona que vive en la vivienda (es_residente), sin huéspedes temporales ni propietarios que no residen. La usan los avisos de pago de servicios (hueco 12).';

revoke execute on function public.notificar_a_quien_vive(uuid, public.motivo_notificacion, text, text, text, uuid) from public, anon, authenticated;
grant execute on function public.notificar_a_quien_vive(uuid, public.motivo_notificacion, text, text, text, uuid) to service_role;

create or replace function public.avisar_servicios_de_vivienda()
returns integer
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  f record;
  n int := 0;
begin
  for f in
    select s.id, s.unidad_id, s.nombre, s.empresa, s.dia_primer_aviso, s.dia_segundo_aviso,
           public.hoy_en_el_edificio(u.condominio_id) as hoy
    from public.servicio_de_vivienda s
    join public.unidad u on u.id = s.unidad_id
  loop
    if exists (
      select 1
      from (values (f.dia_primer_aviso), (f.dia_segundo_aviso)) d(dia)
      where d.dia is not null
        and least(
              d.dia::int,
              extract(day from (date_trunc('month', f.hoy) + interval '1 month - 1 day'))::int
            ) = extract(day from f.hoy)::int
    )
    -- Una vez al día por servicio, aunque los dos avisos caigan el mismo día
    -- o la tarea corra dos veces.
    and not exists (
      select 1 from public.notificacion x
      where x.entidad_id = f.id
        and x.tipo = 'servicio_por_pagar'
        and x.created_at >= now() - interval '20 hours'
    ) then
      -- A quien vive en la vivienda, no al anfitrión (hueco 12).
      perform public.notificar_a_quien_vive(
        f.unidad_id, 'servicio_por_pagar',
        'Recuerda pagar ' || f.nombre,
        'Hoy toca recordar el pago de ' || f.nombre ||
          coalesce(' (' || nullif(btrim(f.empresa), '') || ')', '') || '.',
        'servicio_de_vivienda', f.id
      );
      n := n + 1;
    end if;
  end loop;
  return n;
end;
$$;
