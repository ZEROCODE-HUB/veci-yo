-- Una estancia de huésped no lleva más vehículos que adultos.
--
-- QA 23/10/2026 (T-101): el preregistro paraba en el límite de personas, pero
-- se podían seguir añadiendo vehículos sin fin. Cada vehículo necesita un
-- adulto de la reserva que responda por él (`guardar_vehiculo_precheckin`), así
-- que el tope natural es uno por adulto.
--
-- Pendiente del cliente (T-083): si además se limita a los estacionamientos que
-- ofrece el anfitrión. Mientras, esto solo pone el techo que ya era evidente.
--
-- En un disparador y no en la función de la web: los vehículos también los
-- añaden el anfitrión y la portería, y la regla es la misma.

create or replace function public.vehiculos_no_pasan_de_los_adultos()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_tipo      public.tipo_visita;
  v_adultos   int;
  v_vehiculos int;
begin
  select v.tipo into v_tipo from public.visita v where v.id = new.visita_id;
  if v_tipo is distinct from 'huesped_temporal' then
    return new;
  end if;

  select count(*) into v_adultos
  from public.invitado i
  where i.visita_id = new.visita_id and not coalesce(i.es_menor, false);

  select count(*) into v_vehiculos
  from public.vehiculo_visita x
  where x.visita_id = new.visita_id;

  if v_vehiculos >= greatest(v_adultos, 1) then
    raise exception 'Ya hay un vehículo por cada adulto de la reserva (%). Para otro vehículo, primero añade a la persona que lo trae.',
      greatest(v_adultos, 1)
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

comment on function public.vehiculos_no_pasan_de_los_adultos() is
  'Una estancia de huésped no lleva más vehículos que adultos registrados: '
  'cada vehículo necesita un adulto que responda por él.';

revoke all on function public.vehiculos_no_pasan_de_los_adultos() from public, anon, authenticated;

drop trigger if exists vehiculo_visita_tope_por_adultos on public.vehiculo_visita;
create trigger vehiculo_visita_tope_por_adultos
  before insert on public.vehiculo_visita
  for each row
  execute function public.vehiculos_no_pasan_de_los_adultos();
