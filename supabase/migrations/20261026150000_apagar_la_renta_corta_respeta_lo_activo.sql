-- Apagar la renta corta del edificio respeta lo activo hasta que venza, pero
-- no deja reservas nuevas (hueco 15).
--
-- El cliente respondió el 21/10/2026: «Se respeta lo activo hasta que venza,
-- pero obvio ya no debe dejar nuevas reservas».
--
-- Hasta hoy, al apagarla:
--   · las viviendas que la tenían seguían recibiendo huéspedes sin fin, y
--   · su anfitrión ya no podía guardar nada (el disparador rechazaba cualquier
--     cambio de una suscripción activa en un edificio que no la autoriza).
--
-- Ahora:
--   · la suscripción activa se puede seguir editando;
--   · sigue vigente hasta que termine el período ya pagado
--     (`periodo_suscripcion.hasta`), y no se puede abrir uno nuevo;
--   · ninguna estancia de huésped nueva entra, venga de la pantalla o del
--     calendario de Airbnb/Booking. Las que ya estaban siguen.
--
-- Solo aditiva: reemplaza cuerpos de funciones y añade un disparador.

-- 1. Activar donde no se autoriza, no; seguir con lo que ya estaba activo, sí.
create or replace function public.respetar_autorizacion_renta_corta()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
begin
  -- Cancelar una suscripción siempre se puede.
  if new.estado <> 'activa' then
    return new;
  end if;
  -- Ya estaba activa: se respeta y se puede seguir editando (hueco 15).
  if tg_op = 'UPDATE' and old.estado = 'activa' then
    return new;
  end if;

  if not public.autorizacion_renta_corta(new.unidad_id) then
    raise exception 'Este edificio no autoriza la renta corta en esta vivienda';
  end if;

  return new;
end;
$$;

-- 2. No se renueva donde ya no se autoriza.
create or replace function public.periodo_solo_si_se_autoriza()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_unidad uuid;
begin
  select s.unidad_id into v_unidad
    from public.suscripcion_renta_corta s where s.id = new.suscripcion_id;
  if v_unidad is not null and not public.autorizacion_renta_corta(v_unidad) then
    raise exception
      'El edificio ya no autoriza la renta corta: no se puede renovar. Lo que ya pagaste sigue hasta que venza.';
  end if;
  return new;
end;
$$;

comment on function public.periodo_solo_si_se_autoriza() is
  'No deja abrir un período nuevo de renta corta en una vivienda cuyo edificio ya no la autoriza (hueco 15): lo pagado sigue hasta que venza, pero no se renueva.';

drop trigger if exists periodo_solo_si_se_autoriza on public.periodo_suscripcion;
create trigger periodo_solo_si_se_autoriza
  before insert on public.periodo_suscripcion
  for each row execute function public.periodo_solo_si_se_autoriza();

-- 3. Vigente: si el edificio ya no la autoriza, solo mientras dure lo pagado.
create or replace function public.suscripcion_vigente(p_unidad_id uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
  /*
    La misma regla que `suscripcionVigente` en la aplicación: activa, y si
    tiene fecha de término --el mes ya pagado al darse de baja--, hasta ese día
    inclusive. Con el día del edificio, no el del servidor.

    Y si el edificio apagó la renta corta (hueco 15), solo hasta que termine
    el último período pagado: lo activo se respeta hasta que vence.
  */
  select exists (
    select 1
    from public.suscripcion_renta_corta s
    where s.unidad_id = p_unidad_id
      and s.estado = 'activa'
      and (s.cancelada_en is null or s.cancelada_en >= public.hoy_en_la_unidad(p_unidad_id))
      and (
        public.autorizacion_renta_corta(p_unidad_id)
        or exists (
          select 1 from public.periodo_suscripcion ps
           where ps.suscripcion_id = s.id
             and ps.hasta >= public.hoy_en_la_unidad(p_unidad_id)
        )
      )
  );
$$;

-- 4. Ninguna estancia de huésped nueva donde el edificio ya no la autoriza.
create or replace function public.una_estancia_de_huesped_exige_renta_corta()
returns trigger
language plpgsql
as $$
begin
  if new.tipo <> 'huesped_temporal' then
    return new;
  end if;

  -- Al editar, solo si se convierte en estancia de huésped o cambia de vivienda.
  if tg_op = 'UPDATE'
     and old.tipo = 'huesped_temporal'
     and old.unidad_id is not distinct from new.unidad_id then
    return new;
  end if;

  if new.unidad_id is not null and not public.autorizacion_renta_corta(new.unidad_id) then
    raise exception
      'El edificio apagó la renta corta: ya no se aceptan reservas nuevas. Las que ya tenías siguen.';
  end if;

  if new.unidad_id is null or not public.suscripcion_vigente(new.unidad_id) then
    raise exception
      'Esta vivienda no tiene la renta corta activa. Activala para registrar huespedes temporales.';
  end if;

  return new;
end;
$$;
