-- Sin la renta corta activa en la vivienda, no se registra un huesped temporal.
--
-- Aditiva: funciones y un disparador. No se borra nada, y las estancias que ya
-- existen no se tocan: el disparador mira lo que entra, no lo que hay.
--
-- La regla existia solo en la pantalla. `suscripcionVigente` decide en la
-- aplicacion si se ofrece el formulario, pero la estancia se crea por la API:
-- cualquiera con sesion en una vivienda podia registrar huespedes temporales
-- sin tener el servicio, y el calendario de Airbnb los importaba igual. Es la
-- forma de siempre --la decision vivia en la pantalla, no en el dato--.
--
-- Y dar de alta o de baja el servicio lo decidia la aplicacion: hasta que dia
-- vale lo calculaba el telefono, con su reloj.

-- ============================================================================
-- 1. Si la renta corta funciona hoy en una vivienda
-- ============================================================================

create or replace function public.suscripcion_vigente(p_unidad_id uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
  /*
    La misma regla que `suscripcionVigente` en la aplicacion: activa, y si
    tiene fecha de termino --el mes ya pagado al darse de baja--, hasta ese dia
    inclusive. Con el dia del edificio, no el del servidor.
  */
  select exists (
    select 1
    from public.suscripcion_renta_corta s
    where s.unidad_id = p_unidad_id
      and s.estado = 'activa'
      and (
        s.cancelada_en is null
        or s.cancelada_en >= (
          now() at time zone public.zona_horaria_del_condominio(
            public.condominio_de_unidad(p_unidad_id))
        )::date
      )
  );
$$;

comment on function public.suscripcion_vigente(uuid) is
  'Si la vivienda tiene la renta corta funcionando hoy: activa y, si se dio de '
  'baja, todavia dentro del periodo pagado.';

grant execute on function public.suscripcion_vigente(uuid) to authenticated, service_role;

-- ============================================================================
-- 2. La estancia de huesped la exige
-- ============================================================================

create or replace function public.una_estancia_de_huesped_exige_renta_corta()
returns trigger
language plpgsql
as $$
begin
  if new.tipo <> 'huesped_temporal' then
    return new;
  end if;

  -- Al editar, solo si se convierte en estancia de huesped o cambia de vivienda.
  if tg_op = 'UPDATE'
     and old.tipo = 'huesped_temporal'
     and old.unidad_id is not distinct from new.unidad_id then
    return new;
  end if;

  if new.unidad_id is null or not public.suscripcion_vigente(new.unidad_id) then
    raise exception
      'Esta vivienda no tiene la renta corta activa. Activala para registrar huespedes temporales.';
  end if;

  return new;
end;
$$;

drop trigger if exists visita_exige_renta_corta on public.visita;
create trigger visita_exige_renta_corta
  before insert or update of tipo, unidad_id on public.visita
  for each row execute function public.una_estancia_de_huesped_exige_renta_corta();

-- ============================================================================
-- 3. Activar y dar de baja, decididos en la base
-- ============================================================================

create or replace function public.activar_suscripcion_renta_corta(p_unidad_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
begin
  if not public.puede_configurar_alojamiento(p_unidad_id) then
    raise exception 'No puedes activar la renta corta de esa vivienda'
      using errcode = '42501';
  end if;

  /*
    Una fila por vivienda: si ya tuvo el servicio, se reactiva la misma. Si el
    edificio no autoriza la renta corta, lo rechaza el disparador de la tabla,
    que es quien lo sabe.
  */
  insert into public.suscripcion_renta_corta (unidad_id, estado, cancelada_en)
  values (p_unidad_id, 'activa', null)
  on conflict (unidad_id) do update
    set estado = 'activa', cancelada_en = null;
end;
$$;

comment on function public.activar_suscripcion_renta_corta(uuid) is
  'Activa la renta corta de una vivienda. Lo hace quien responde por ella.';

revoke execute on function public.activar_suscripcion_renta_corta(uuid) from public, anon;
grant execute on function public.activar_suscripcion_renta_corta(uuid) to authenticated, service_role;

create or replace function public.cancelar_suscripcion_renta_corta(p_unidad_id uuid)
returns table (termina_en date, inmediata boolean)
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_suscripcion uuid;
  v_hoy         date;
  v_hasta       date;
begin
  if not public.puede_configurar_alojamiento(p_unidad_id) then
    raise exception 'No puedes dar de baja la renta corta de esa vivienda'
      using errcode = '42501';
  end if;

  select s.id into v_suscripcion
  from public.suscripcion_renta_corta s
  where s.unidad_id = p_unidad_id;

  if v_suscripcion is null then
    raise exception 'Esta vivienda no tiene renta corta';
  end if;

  v_hoy := (now() at time zone public.zona_horaria_del_condominio(
              public.condominio_de_unidad(p_unidad_id)))::date;

  /*
    Se respeta el mes ya pagado --decision del cliente del 29/09/2026--: si
    queda periodo, sigue activa hasta su ultimo dia. Si no, se corta hoy.
  */
  select max(p.hasta) into v_hasta
  from public.periodo_suscripcion p
  where p.suscripcion_id = v_suscripcion
    and p.hasta >= v_hoy;

  update public.suscripcion_renta_corta
  set estado       = case when v_hasta is null then 'cancelada' else 'activa' end::estado_suscripcion,
      cancelada_en = coalesce(v_hasta, v_hoy)
  where id = v_suscripcion;

  return query select coalesce(v_hasta, v_hoy), v_hasta is null;
end;
$$;

comment on function public.cancelar_suscripcion_renta_corta(uuid) is
  'Da de baja la renta corta respetando el periodo ya pagado. Devuelve el dia '
  'en que deja de funcionar y si fue inmediata.';

revoke execute on function public.cancelar_suscripcion_renta_corta(uuid) from public, anon;
grant execute on function public.cancelar_suscripcion_renta_corta(uuid) to authenticated, service_role;

notify pgrst, 'reload schema';
