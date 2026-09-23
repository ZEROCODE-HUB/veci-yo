-- ----------------------------------------------------------------------------
-- Los límites que pone el condominio se respetan
-- ----------------------------------------------------------------------------
-- `limite_renta_corta_condominio` existe para que un edificio decida tres
-- cosas sobre la renta corta: si se permite, cuántas personas caben como
-- máximo en una vivienda y cuántas noches como mínimo dura una estancia.
--
-- No la lee nadie. Ni una política, ni una función, ni una restricción. El
-- interruptor con el que un condominio **prohíbe** la renta corta no existe
-- funcionalmente: cualquier propietario puede dar de alta su suscripción
-- aunque el edificio la tenga vetada.
--
-- Es el mismo patrón que `restringida_huesped`, las casillas de audiencia,
-- `requiere_aprobacion` y `perfil.verificado`. Este es el séptimo.
--
-- Se aplican aquí los dos límites que son del alta de la suscripción. El
-- tercero —la estancia mínima— es del alta del huésped y queda anotado: toca
-- la invitación y la membresía, y merece su propio cambio.

create or replace function public.respetar_limites_renta_corta()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_condominio uuid;
  v_permite boolean;
  v_capacidad integer;
begin
  select u.condominio_id into v_condominio
  from public.unidad u where u.id = new.unidad_id;

  select l.permite_renta_corta, l.capacidad_maxima
    into v_permite, v_capacidad
  from public.limite_renta_corta_condominio l
  where l.condominio_id = v_condominio;

  -- Sin fila de límites no hay restricción: un condominio que no ha dicho
  -- nada no está prohibiendo nada. La ausencia de regla no es una regla.
  if not found then
    return new;
  end if;

  if v_permite is false then
    raise exception 'Este condominio no permite la renta corta';
  end if;

  if v_capacidad is not null
     and new.max_huespedes is not null
     and new.max_huespedes > v_capacidad then
    raise exception 'El condominio permite como maximo % huespedes por vivienda', v_capacidad;
  end if;

  return new;
end;
$$;

drop trigger if exists suscripcion_renta_corta_limites on public.suscripcion_renta_corta;

create trigger suscripcion_renta_corta_limites
  before insert or update on public.suscripcion_renta_corta
  for each row execute function public.respetar_limites_renta_corta();

comment on function public.respetar_limites_renta_corta() is
  'Hace valer limite_renta_corta_condominio al dar de alta o cambiar una suscripcion. Sin fila de limites no hay restriccion.';
