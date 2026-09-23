-- ----------------------------------------------------------------------------
-- Dos reservas en la misma franja
-- ----------------------------------------------------------------------------
-- `FranjaHoraria` existe para pintar "Ocupado" sobre las reservas ajenas, y
-- `zona_comun.cupos_simultaneos` dice cuantas caben a la vez —1 en la piscina,
-- 1 en el salon de eventos, 4 en la lavanderia, que tiene cuatro lavadoras—.
--
-- Ninguna de las dos cosas funcionaba:
--
--   * `reserva_zona_lectura` solo entrega a un vecino **sus propias**
--     reservas, asi que la grilla le sale entera vacia y todas las franjas
--     dicen "+ Reservar". La insignia "Ocupado" no se pintaba nunca.
--   * `cupos_simultaneos` no la leia nadie: ni una politica, ni una funcion,
--     ni el cliente. La base aceptaba las reservas que le echaran.
--
-- Es la misma forma de siempre —la decision vivia en la pantalla, no en el
-- dato—, con el agravante de que aqui la pantalla tampoco podia cumplirla
-- porque no recibia los datos.
--
-- Se arregla en dos piezas, y ninguna abre la RLS:
--
--   1. `ocupacion_zona()` devuelve las franjas tomadas **sin decir de quien
--      son**. Un vecino necesita saber que la piscina esta cogida a las 10,
--      no quien la cogio.
--   2. Un disparador impone `cupos_simultaneos`. Va en la base y no en la
--      pantalla porque la pantalla no es el limite: cualquiera puede llamar
--      a la API.
--
-- No se toca `EXCLUDE`: no serviria para `cupos_simultaneos > 1`, y ademas
-- las reservas de prueba que ya hay en la base se solapan entre si a miles,
-- asi que una restriccion de tabla ni se podria crear. El disparador solo
-- mira lo que se escribe de ahora en adelante.

-- ----------------------------------------------------------------------------
-- Que franjas estan tomadas
-- ----------------------------------------------------------------------------
create or replace function public.ocupacion_zona(
  p_zona_id uuid,
  p_desde   date,
  p_hasta   date
)
returns table (
  fecha       date,
  hora_inicio time,
  hora_fin    time,
  propia      boolean
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select r.fecha, r.hora_inicio, r.hora_fin,
         public.es_miembro_unidad(r.unidad_id)
           or r.solicitada_por = auth.uid() as propia
  from public.reserva_zona r
  join public.zona_comun z on z.id = r.zona_id
  where r.zona_id = p_zona_id
    and r.fecha between p_desde and p_hasta
    and r.estado not in ('rechazada', 'cancelada')
    -- El ambito lo pone la funcion: solo se responde a quien vive o se aloja
    -- en el condominio de la zona.
    and (public.es_miembro_condominio(z.condominio_id)
         or public.es_huesped_del_condominio(z.condominio_id))
  order by r.fecha, r.hora_inicio;
$$;

comment on function public.ocupacion_zona(uuid, date, date) is
  'Las franjas tomadas de una zona, sin decir de quien son. La grilla de disponibilidad la necesita y `reserva_zona_lectura` solo entrega las propias.';

revoke all on function public.ocupacion_zona(uuid, date, date) from public;
grant execute on function public.ocupacion_zona(uuid, date, date) to authenticated;


-- ----------------------------------------------------------------------------
-- Los cupos simultaneos
-- ----------------------------------------------------------------------------
create or replace function public.respetar_cupos_simultaneos()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_cupos   integer;
  v_tomadas integer;
begin
  -- Una reserva rechazada o cancelada no ocupa nada.
  if new.estado in ('rechazada', 'cancelada') then
    return new;
  end if;

  select coalesce(z.cupos_simultaneos, 1) into v_cupos
  from public.zona_comun z where z.id = new.zona_id;

  if v_cupos is null or v_cupos <= 0 then
    return new;
  end if;

  -- Sin el cerrojo, dos altas a la vez contarian las dos el mismo hueco y
  -- pasarian las dos. Se suelta al terminar la transaccion.
  perform pg_advisory_xact_lock(
    hashtext(new.zona_id::text || '|' || new.fecha::text));

  select count(*) into v_tomadas
  from public.reserva_zona r
  where r.zona_id = new.zona_id
    and r.fecha = new.fecha
    and r.id <> new.id
    and r.estado not in ('rechazada', 'cancelada')
    and r.hora_inicio < new.hora_fin
    and new.hora_inicio < r.hora_fin;

  if v_tomadas >= v_cupos then
    raise exception
      'La franja de % a % del % ya esta ocupada (% de % cupos).',
      to_char(new.hora_inicio, 'HH24:MI'), to_char(new.hora_fin, 'HH24:MI'),
      to_char(new.fecha, 'DD/MM/YYYY'), v_tomadas, v_cupos
      using errcode = 'check_violation',
            constraint = 'reserva_zona_cupos_simultaneos';
  end if;

  return new;
end;
$$;

comment on function public.respetar_cupos_simultaneos() is
  '`zona_comun.cupos_simultaneos` decide cuantas reservas caben a la vez en una franja. No la leia nadie.';

drop trigger if exists reserva_zona_respetar_cupos on public.reserva_zona;
create trigger reserva_zona_respetar_cupos
  before insert or update of zona_id, fecha, hora_inicio, hora_fin, estado
  on public.reserva_zona
  for each row execute function public.respetar_cupos_simultaneos();
