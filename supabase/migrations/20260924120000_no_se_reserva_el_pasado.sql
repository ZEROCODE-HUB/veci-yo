-- ----------------------------------------------------------------------------
-- No se reserva el pasado
-- ----------------------------------------------------------------------------
-- `reserva_zona` no tenia ninguna restriccion sobre `fecha`: se podia reservar
-- la lavanderia para el martes anterior. Lo reporto el cliente el 24/09/2026 y
-- no lo impedia nada, ni en la base ni en la pantalla.
--
-- La decision vive aqui y no en el calendario porque una pantalla puede dejar
-- de ofrecer los dias pasados y aun asi la base aceptaria la fila: basta otra
-- pantalla, una version vieja de la aplicacion, o una llamada directa.
--
-- ----------------------------------------------------------------------------
-- Por que no es un `check` con `current_date`
-- ----------------------------------------------------------------------------
-- Dos razones. La primera es que `current_date` no es inmutable y un `check`
-- exige que lo sea. La segunda importa mas: **`current_date` es UTC**, y el
-- condominio esta en Bogota. Entre las 19:00 y la medianoche de Bogota, en UTC
-- ya es el dia siguiente, asi que una reserva para *hoy* se rechazaria durante
-- cinco horas cada dia. Es el mismo error que ya aparecio una vez en las
-- pruebas, con `toISOString().slice(0,10)`.
--
-- Colombia y Peru --los dos paises del producto-- estan en UTC-5 y ninguno
-- aplica horario de verano, asi que la zona se deriva del pais. Cuando entre un
-- tercero, se agrega aqui o se le da columna propia al condominio; lo que no
-- vale es volver a `current_date`.

create or replace function public.zona_horaria_del_condominio(p_condominio_id uuid)
returns text
language sql stable security definer set search_path = public, pg_temp
as $$
  select case btrim(c.pais)
           when 'CO' then 'America/Bogota'
           when 'PE' then 'America/Lima'
           else 'America/Bogota'
         end
  from public.condominio c
  where c.id = p_condominio_id;
$$;

comment on function public.zona_horaria_del_condominio(uuid) is
  'Zona horaria del condominio, derivada de su pais. CO y PE son UTC-5 sin horario de verano; un tercer pais se agrega aqui.';


create or replace function public.hoy_en_el_condominio(p_condominio_id uuid)
returns date
language sql stable security definer set search_path = public, pg_temp
as $$
  select (now() at time zone coalesce(
    public.zona_horaria_del_condominio(p_condominio_id), 'America/Bogota'
  ))::date;
$$;

comment on function public.hoy_en_el_condominio(uuid) is
  'Que dia es hoy **alli**. `current_date` es UTC y adelanta el dia cinco horas antes que Bogota.';


create or replace function public.reserva_no_en_el_pasado()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_condominio uuid;
  v_hoy        date;
begin
  -- Solo cuando la fecha entra o cambia. Cancelar o resolver una reserva
  -- antigua sigue siendo posible: si no, no se podria cerrar el historico.
  if tg_op = 'UPDATE' and new.fecha is not distinct from old.fecha then
    return new;
  end if;

  select z.condominio_id into v_condominio
  from public.zona_comun z
  where z.id = new.zona_id;

  v_hoy := public.hoy_en_el_condominio(v_condominio);

  if new.fecha < v_hoy then
    raise exception 'No se puede reservar el %: ya pasó (hoy es % en el condominio)',
      to_char(new.fecha, 'DD/MM/YYYY'), to_char(v_hoy, 'DD/MM/YYYY')
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

comment on function public.reserva_no_en_el_pasado() is
  'Rechaza una reserva cuya fecha ya paso, contando el dia en la zona horaria del condominio.';

drop trigger if exists reserva_zona_no_en_el_pasado on public.reserva_zona;

create trigger reserva_zona_no_en_el_pasado
before insert or update of fecha
on public.reserva_zona
for each row
execute function public.reserva_no_en_el_pasado();
