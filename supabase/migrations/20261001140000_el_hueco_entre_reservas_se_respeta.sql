-- ----------------------------------------------------------------------------
-- El hueco entre dos reservas deja de ser decorativo
-- ----------------------------------------------------------------------------
-- `zona_comun.tiempo_min_entre_reservas` existe desde la primera migracion, la
-- administracion lo configura por zona --con su campo, su validacion y un valor
-- por defecto de 30 minutos para una zona nueva-- y **no lo aplicaba nadie**:
-- ni un disparador, ni una politica, ni una restriccion, ni la pantalla al
-- reservar. Se podia reservar la parrilla de 10 a 12 y otra vez de 12 a 14, sin
-- el hueco de limpieza que el edificio habia pedido.
--
-- Encontrado el 01/10/2026 barriendo columnas que la aplicacion escribe y nadie
-- lee (REVISAR-A-OJO 97).
--
-- Hoy no se nota porque las tres zonas que existen lo tienen en **0**, pero el
-- formulario arranca en 30: la siguiente zona que alguien cree nace con una
-- regla que nadie respeta.
--
-- Decidido con el cliente el 01/10/2026: **se bloquea**, como el aforo. El
-- precedente del cliente para los limites del edificio es «advertencia, no
-- bloqueo duro», pero eso es para lo que depende de la voluntad de alguien;
-- este hueco existe para algo fisico --limpiar, ventilar, secar-- y una
-- advertencia no limpia una parrilla.
--
-- ----------------------------------------------------------------------------
-- El hueco es por **puesto**, no por zona
-- ----------------------------------------------------------------------------
-- La lavanderia tiene cuatro cupos simultaneos y `reserva_zona.numero_recurso`
-- dice cual. Dos personas lavando a la vez en maquinas distintas es correcto y
-- no hay nada que limpiar entre medias; lo que necesita el hueco es **la misma
-- maquina**, una detras de otra.
--
-- Mirarlo por zona rechazaria la segunda lavadora a la misma hora, que es justo
-- lo que los cuatro cupos permiten a proposito.

create or replace function public.respetar_hueco_entre_reservas()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare
  v_hueco   integer;
  v_choque  record;
begin
  -- Una reserva rechazada o cancelada no ocupa nada, igual que en el aforo.
  if new.estado in ('rechazada', 'cancelada') then
    return new;
  end if;

  select coalesce(z.tiempo_min_entre_reservas, 0) into v_hueco
  from public.zona_comun z where z.id = new.zona_id;

  -- Sin hueco configurado no hay nada que respetar, que es como estan hoy las
  -- tres zonas del edificio.
  if v_hueco is null or v_hueco <= 0 then
    return new;
  end if;

  /*
    El mismo cerrojo que usa el aforo, y por el mismo motivo: sin el, dos altas
    a la vez se verian la una a la otra como inexistentes y pasarian las dos.
    Se suelta al terminar la transaccion.
  */
  perform pg_advisory_xact_lock(
    hashtext(new.zona_id::text || '|' || new.fecha::text));

  /*
    Se busca una reserva del **mismo puesto** cuyo final quede demasiado cerca
    del inicio de esta, o al reves. El solape entero ya lo rechaza el aforo;
    aqui lo que se mira es la distancia entre una y otra.

    `coalesce(numero_recurso, 0)` porque las zonas de un solo cupo no lo
    rellenan, y entonces todas las reservas son del mismo puesto, que es lo
    correcto para una piscina o un salon.
  */
  select r.hora_inicio, r.hora_fin into v_choque
  from public.reserva_zona r
  where r.zona_id = new.zona_id
    and r.fecha = new.fecha
    and r.id <> new.id
    and r.estado not in ('rechazada', 'cancelada')
    and coalesce(r.numero_recurso, 0) = coalesce(new.numero_recurso, 0)
    and (
      -- La otra termina antes de que esta empiece, pero sin el hueco.
      (r.hora_fin <= new.hora_inicio
       and new.hora_inicio - r.hora_fin < make_interval(mins => v_hueco))
      or
      -- O esta termina antes de que empiece la otra, igual de pegadas.
      (new.hora_fin <= r.hora_inicio
       and r.hora_inicio - new.hora_fin < make_interval(mins => v_hueco))
    )
  limit 1;

  if found then
    raise exception
      'Esta zona necesita % minutos entre una reserva y la siguiente, y hay otra de % a %.',
      v_hueco,
      to_char(v_choque.hora_inicio, 'HH24:MI'),
      to_char(v_choque.hora_fin, 'HH24:MI')
      using errcode = 'check_violation',
            constraint = 'reserva_zona_hueco_minimo';
  end if;

  return new;
end;
$fn$;

comment on function public.respetar_hueco_entre_reservas() is
  'Hace valer zona_comun.tiempo_min_entre_reservas: dos reservas del mismo puesto no pueden quedar mas pegadas que ese hueco. El solape lo rechaza el aforo; esto mira la distancia.';

drop trigger if exists reserva_zona_hueco_minimo on public.reserva_zona;

-- `before insert or update` y no solo `insert`: mover una reserva encima de
-- otra es la misma jugada por la puerta de atras, y en este proyecto ya se
-- quedo una ventana asi abierta.
create trigger reserva_zona_hueco_minimo
  before insert or update on public.reserva_zona
  for each row execute function public.respetar_hueco_entre_reservas();
