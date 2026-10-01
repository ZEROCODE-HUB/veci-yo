-- Tampoco una hora que ya paso.
--
-- `reserva_no_en_el_pasado` compara solo la FECHA: a las 18:45 la aplicacion
-- ofrece la franja de las 06:00 de hoy y la base la acepta. Los dias pasados
-- si estaban bloqueados; las horas del propio dia, no (R-15).
--
-- El cliente lo decidio el 25/09/2026: **un residente no puede, pero porteria
-- y administracion si**, porque necesitan poder registrar un uso que ya
-- ocurrio --alguien uso la lavanderia sin reservar y hay que dejarlo anotado--.
--
-- Aditiva: no borra ninguna columna ni ninguna fila.

create or replace function public.reserva_no_en_el_pasado()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare
  v_condominio uuid;
  v_hoy        date;
  v_ahora      time;
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

  -- Porteria y administracion registran lo que ya paso: es su trabajo. Se
  -- comprueba antes que nada para que el resto de la funcion no les aplique.
  if public.es_personal_condominio(v_condominio) then
    return new;
  end if;

  if new.fecha < v_hoy then
    raise exception 'No se puede reservar el %: ya pasó (hoy es % en el condominio)',
      to_char(new.fecha, 'DD/MM/YYYY'), to_char(v_hoy, 'DD/MM/YYYY')
      using errcode = 'check_violation';
  end if;

  -- Y la hora, el mismo dia. La zona horaria es la del condominio, igual que
  -- la fecha: en UTC serian las de mañana durante las ultimas cinco horas del
  -- dia en Bogota, y se estaria comparando contra el reloj equivocado.
  if new.fecha = v_hoy then
    v_ahora := (now() at time zone public.zona_horaria_del_condominio(v_condominio))::time;
    if new.hora_inicio < v_ahora then
      raise exception 'Esa franja ya pasó: son las % en el condominio',
        to_char(v_ahora, 'HH24:MI')
        using errcode = 'check_violation';
    end if;
  end if;

  return new;
end;
$fn$;

comment on function public.reserva_no_en_el_pasado() is
  'Ni un dia ni una hora que ya pasaron, en la zona horaria del condominio. Porteria y administracion quedan fuera: registran usos ya ocurridos, que es parte de su trabajo.';
