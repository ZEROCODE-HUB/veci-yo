-- ----------------------------------------------------------------------------
-- Un huésped no mete gente de fuera en una zona común (27/10/2026)
-- ----------------------------------------------------------------------------
-- Hueco 42 del GSheet (punto 25 de REVISAR-A-OJO). Al reservar una zona común,
-- un huésped de renta corta escribía los nombres de los asistentes a mano y
-- con el tipo que quisiera, así que podía apuntar a gente de fuera del
-- edificio sin pasar por la portería. El cliente: «No».
--
-- La regla: cuando quien apunta es el propio huésped, en una reserva suya,
-- solo puede apuntar a personas de su estancia en esa vivienda --él mismo y sus
-- acompañantes, que pasaron por el preregistro--, y con el tipo «huésped
-- temporal». La administración y la portería siguen pudiendo anotar a quien
-- llegue (el reemplazo de `RegistroDeAsistentes`). Quien además vive en la
-- vivienda no cuenta como huésped. Solo aditiva.

create or replace function public.nombres_de_mi_estancia(p_unidad_id uuid)
returns setof text
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $function$
  select distinct trim(otros.nombre || coalesce(' ' || nullif(trim(otros.apellidos), ''), ''))
  from public.invitado yo
  join public.visita v on v.id = yo.visita_id
  join public.invitado otros on otros.visita_id = yo.visita_id
  where yo.usuario_id = auth.uid()
    and v.unidad_id = p_unidad_id
    and v.tipo = 'huesped_temporal'
    and v.deleted_at is null
    and v.estado <> 'cancelada'
    and (v.fecha_hasta is null or v.fecha_hasta >= public.hoy_en_la_unidad(p_unidad_id))
    and trim(otros.nombre) <> '';
$function$;

comment on function public.nombres_de_mi_estancia(uuid) is
  'Los nombres de las personas de mi estancia de huésped vigente en esa vivienda, yo incluido: los únicos que un huésped puede apuntar a una zona común (hueco 42).';

revoke execute on function public.nombres_de_mi_estancia(uuid) from public, anon;
grant execute on function public.nombres_de_mi_estancia(uuid) to authenticated, service_role;

create or replace function public.huesped_solo_apunta_a_su_estancia()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_unidad uuid;
  v_solicitante uuid;
begin
  if auth.uid() is null then
    return new;
  end if;

  select r.unidad_id, r.solicitada_por into v_unidad, v_solicitante
  from public.reserva_zona r where r.id = new.reserva_id;

  if v_solicitante is distinct from auth.uid()
     or not public.es_huesped_con_reserva(v_unidad)
     or exists (
       select 1 from public.membresia_unidad m
       where m.unidad_id = v_unidad and m.usuario_id = auth.uid()
         and m.activo and m.rol <> 'huesped_temporal'
     )
  then
    return new;
  end if;

  if new.tipo is distinct from 'huesped_temporal'
     or not exists (
       select 1 from public.nombres_de_mi_estancia(v_unidad) n
       where lower(n) = lower(trim(new.nombre))
     )
  then
    raise exception 'Un huésped solo puede apuntar a las personas de su estancia: %.', trim(new.nombre)
      using errcode = '42501';
  end if;
  return new;
end;
$function$;

comment on function public.huesped_solo_apunta_a_su_estancia() is
  'Un huésped que apunta asistentes a su reserva de zona común solo puede elegir personas de su estancia, como huésped temporal. La administración y la portería no tienen ese límite. Hueco 42, 27/10/2026.';

drop trigger if exists participante_reserva_solo_su_estancia on public.participante_reserva;
create trigger participante_reserva_solo_su_estancia
  before insert or update of nombre, tipo on public.participante_reserva
  for each row execute function public.huesped_solo_apunta_a_su_estancia();

revoke execute on function public.huesped_solo_apunta_a_su_estancia() from public, anon, authenticated;
