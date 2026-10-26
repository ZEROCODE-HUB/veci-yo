-- Una estancia respeta las noches y la capacidad que fijó el anfitrión
-- (huecos 10 y 28).
--
-- Hueco 10 (21/10/2026): «si tiene noches mínimas se deben usar y respetar,
-- obvio que debe bloquearse y avisarle por qué». La pantalla de nueva reserva
-- ya lo hacía (24/10); «Editar la reserva» no, y la base tampoco.
-- Hueco 28 (21/10/2026): «el tope de personas debe ser lo que fijó el
-- anfitrión». El preregistro ya respetaba el aforo; la app ofrecía hasta 99.
--
-- Las estancias que trae el calendario de Airbnb o Booking quedan fuera, a
-- propósito: esas las decidió la plataforma y Veciyo solo las copia.
--
-- Solo aditiva: una función y un disparador.

create or replace function public.estancia_respeta_al_anfitrion()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  s public.suscripcion_renta_corta%rowtype;
  v_noches int;
begin
  if new.tipo <> 'huesped_temporal' or new.origen = 'calendario' then
    return new;
  end if;
  -- Al editar, solo si cambia lo que se comprueba.
  if tg_op = 'UPDATE'
     and old.fecha_desde is not distinct from new.fecha_desde
     and old.fecha_hasta is not distinct from new.fecha_hasta
     and old.huespedes_previstos is not distinct from new.huespedes_previstos then
    return new;
  end if;

  select * into s from public.suscripcion_renta_corta where unidad_id = new.unidad_id;
  if s.id is null then
    return new;
  end if;

  if new.fecha_desde is not null and new.fecha_hasta is not null then
    v_noches := new.fecha_hasta - new.fecha_desde;
    if s.estancia_minima_noches is not null and v_noches < s.estancia_minima_noches then
      raise exception 'Esta vivienda acepta estancias de al menos % noches (lo fijó el anfitrión en Huéspedes temporales); esta es de %.',
        s.estancia_minima_noches, v_noches;
    end if;
    if s.estancia_maxima_noches is not null and v_noches > s.estancia_maxima_noches then
      raise exception 'Esta vivienda acepta estancias de hasta % noches (lo fijó el anfitrión en Huéspedes temporales); esta es de %.',
        s.estancia_maxima_noches, v_noches;
    end if;
  end if;

  if new.huespedes_previstos is not null and s.max_huespedes is not null
     and new.huespedes_previstos > s.max_huespedes then
    raise exception 'En esta vivienda caben % personas como máximo (lo fijó el anfitrión).', s.max_huespedes;
  end if;

  return new;
end;
$$;

comment on function public.estancia_respeta_al_anfitrion() is
  'Una estancia de huésped creada o editada en Veciyo respeta las noches mínimas y máximas y la capacidad de la vivienda (huecos 10 y 28). Las del calendario de Airbnb/Booking quedan fuera.';

drop trigger if exists visita_respeta_al_anfitrion on public.visita;
create trigger visita_respeta_al_anfitrion
  before insert or update of fecha_desde, fecha_hasta, huespedes_previstos on public.visita
  for each row execute function public.estancia_respeta_al_anfitrion();
