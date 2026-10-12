-- ============================================================================
-- Las visitas dicen lo que paso
-- ============================================================================
-- Recorrido de las visitas corrientes con vecina y porteria, el 12/10/2026.
-- Tres cosas que la base dejaba pasar:
--
--   1. Una visita de tres personas en la que una no llega nunca se quedaba
--      «ingresada» para siempre, aunque las otras dos ya hubieran salido: la
--      porteria la seguia viendo «dentro» y su estacionamiento no se soltaba.
--      Terminaba solo cuando **todos** tenian salida, incluido quien no entro.
--   2. Se podia quitar la entrada de alguien y dejarle la salida puesta: una
--      persona que salio sin haber entrado.
--   3. Un vecino podia anunciar una visita para un dia que ya paso.

-- ----------------------------------------------------------------------------
-- 1. La visita termina cuando no queda nadie dentro
-- ----------------------------------------------------------------------------
create or replace function public.sincronizar_estado_visita()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_visita     uuid;
  v_entraron   int;
  v_dentro     int;
  v_primera    timestamptz;
  v_ultima     timestamptz;
  v_estado     public.estado_visita;
  v_termino    boolean;
begin
  v_visita := coalesce(new.visita_id, old.visita_id);
  if v_visita is null then
    return coalesce(new, old);
  end if;

  select count(*) filter (where i.llego or i.ingreso_en is not null),
         count(*) filter (where (i.llego or i.ingreso_en is not null) and i.salida_en is null),
         min(i.ingreso_en),
         max(i.salida_en)
    into v_entraron, v_dentro, v_primera, v_ultima
  from public.invitado i
  where i.visita_id = v_visita;

  -- Una visita cancelada no vuelve sola: cancelarla es una decision de alguien,
  -- y que un invitado marque su llegada no la deshace.
  if (select v.estado from public.visita v where v.id = v_visita) = 'cancelada' then
    return coalesce(new, old);
  end if;

  -- Termino si entro alguien y ya no queda nadie dentro. Quien no llego no
  -- la mantiene abierta; si llega despues, vuelve a «ingresada» sola.
  v_termino := v_entraron > 0 and v_dentro = 0;

  if v_termino then
    v_estado := 'finalizada';
  elsif v_entraron > 0 then
    v_estado := 'ingresada';
  else
    -- Se puede volver atras: si el guardia desmarca una llegada que apunto por
    -- error, la visita vuelve a estar programada en vez de quedarse mintiendo.
    v_estado := 'programada';
  end if;

  update public.visita v
     set estado     = v_estado,
         ingreso_en = case when v_entraron > 0 then coalesce(v_primera, v.ingreso_en, now()) else null end,
         salida_en  = case when v_termino then v_ultima else null end,
         updated_at = now()
   where v.id = v_visita
     and (v.estado is distinct from v_estado
          or v.ingreso_en is distinct from (case when v_entraron > 0 then coalesce(v_primera, v.ingreso_en, now()) else null end)
          or v.salida_en is distinct from (case when v_termino then v_ultima else null end));

  return coalesce(new, old);
end;
$function$;

-- ----------------------------------------------------------------------------
-- 2. Sin entrada no hay salida
-- ----------------------------------------------------------------------------
create or replace function public.sin_entrada_no_hay_salida()
returns trigger
language plpgsql
set search_path to 'public', 'pg_temp'
as $fn$
begin
  if coalesce(new.llego, false) = false and new.ingreso_en is null then
    new.salida_en := null;
  end if;
  return new;
end;
$fn$;

comment on function public.sin_entrada_no_hay_salida() is
  'Al quitar la entrada de un invitado se le quita tambien la salida: nadie sale de donde no entro.';

drop trigger if exists invitado_sin_entrada_no_hay_salida on public.invitado;
create trigger invitado_sin_entrada_no_hay_salida
  before insert or update on public.invitado
  for each row execute function public.sin_entrada_no_hay_salida();

-- ----------------------------------------------------------------------------
-- 3. Un vecino no anuncia una visita para un dia que ya paso
-- ----------------------------------------------------------------------------
-- Porteria y administracion si anotan lo que ya paso: es su trabajo. Y sin
-- sesion son las herramientas y la sincronizacion del calendario.
create or replace function public.visita_no_en_el_pasado()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $fn$
declare
  v_hoy date;
begin
  if auth.uid() is null or new.fecha_desde is null then
    return new;
  end if;
  if public.es_personal_condominio(new.condominio_id) then
    return new;
  end if;

  v_hoy := (now() at time zone public.zona_horaria_del_condominio(new.condominio_id))::date;
  if new.fecha_desde < v_hoy then
    raise exception 'No se puede registrar una visita para el %: ese día ya pasó.',
      to_char(new.fecha_desde, 'DD/MM/YYYY')
      using errcode = 'check_violation',
            constraint = 'visita_no_en_el_pasado';
  end if;
  return new;
end;
$fn$;

comment on function public.visita_no_en_el_pasado() is
  'Rechaza que un vecino cree una visita con fecha anterior a hoy, con el reloj del edificio. El personal del condominio si puede.';

drop trigger if exists visita_no_en_el_pasado on public.visita;
create trigger visita_no_en_el_pasado
  before insert on public.visita
  for each row execute function public.visita_no_en_el_pasado();
