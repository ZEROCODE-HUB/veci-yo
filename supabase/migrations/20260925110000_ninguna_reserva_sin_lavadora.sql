-- ---------------------------------------------------------------------------
-- Ninguna reserva viva se queda sin lavadora
-- ---------------------------------------------------------------------------
-- La pantalla se contradecía: en la franja de las 06:00 el contador decía
-- «quedan 2 de 4» y el desplegable ofrecía **tres** lavadoras. Las dos cuentas
-- eran correctas y medían cosas distintas:
--
--   * el contador cuenta **reservas**: había dos vivas, luego dos huecos;
--   * el desplegable cuenta **números ocupados**: solo una de las dos reservas
--     tenía número, así que sobraban tres.
--
-- La culpa es de la reserva sin número. Se creó antes de que existiera la
-- columna (`20260925090000`), y una reserva que ocupa un puesto sin decir cuál
-- deja a las dos cuentas hablando de cosas distintas para siempre. Lo peor es
-- que estaba escrito como si fuera correcto: «una reserva vieja sin número no
-- bloquea ninguna lavadora» tenía hasta su prueba.
--
-- No se tapa en la pantalla: se quita el caso. En una zona con más de un
-- puesto, una reserva viva **siempre** tiene número.
--
-- El disparador no lo exige: lo **asigna**. Rechazar rompería a cualquiera que
-- escriba por la API sin saber de esto --las pruebas, un importador, la propia
-- app en una zona que mañana pase de uno a cuatro puestos-- y además no hace
-- falta: si quedan puestos libres, coger el primero es exactamente lo que
-- haría quien atiende la lavandería. Y si no quedan, ya lo rechaza el
-- disparador de cupos.


-- ---------------------------------------------------------------------------
-- El primer puesto libre de una franja
-- ---------------------------------------------------------------------------
create or replace function public.primer_puesto_libre(
  p_zona_id     uuid,
  p_fecha       date,
  p_hora_inicio time,
  p_hora_fin    time,
  p_excluir     uuid default null
)
returns integer
language sql
stable
security definer
set search_path = public, pg_temp
as $libre$
  select n
  from generate_series(
         1,
         coalesce((select z.cupos_simultaneos from public.zona_comun z
                    where z.id = p_zona_id), 1)
       ) as n
  where not exists (
    select 1
    from public.reserva_zona r
    where r.zona_id = p_zona_id
      and r.fecha = p_fecha
      and r.numero_recurso = n
      and (p_excluir is null or r.id <> p_excluir)
      and r.estado not in ('rechazada', 'cancelada')
      and r.hora_inicio < p_hora_fin
      and p_hora_inicio < r.hora_fin
  )
  order by n
  limit 1;
$libre$;

comment on function public.primer_puesto_libre(uuid, date, time, time, uuid) is
  'El numero mas bajo que no tiene reserva viva solapada en esa franja. Nulo si estan todos cogidos.';


-- ---------------------------------------------------------------------------
-- Las que ya estaban sin numero
-- ---------------------------------------------------------------------------
-- De una en una y en orden, porque cada asignacion cambia lo que queda libre
-- para la siguiente.
do $backfill$
declare
  r      record;
  v_libre integer;
begin
  for r in
    select rz.id, rz.zona_id, rz.fecha, rz.hora_inicio, rz.hora_fin
      from public.reserva_zona rz
      join public.zona_comun z on z.id = rz.zona_id
     where rz.numero_recurso is null
       and rz.estado not in ('rechazada', 'cancelada')
       and coalesce(z.cupos_simultaneos, 1) > 1
     order by rz.fecha, rz.hora_inicio, rz.created_at
  loop
    v_libre := public.primer_puesto_libre(
      r.zona_id, r.fecha, r.hora_inicio, r.hora_fin, r.id);

    -- Si no queda ninguno libre se deja en nulo: inventarse un numero seria
    -- poner a dos personas en la misma lavadora. Que existan esas filas es
    -- otro problema --el disparador de cupos no estaba cuando se crearon-- y
    -- no se arregla aqui.
    if v_libre is not null then
      update public.reserva_zona
         set numero_recurso = v_libre
       where id = r.id;
    end if;
  end loop;
end
$backfill$;


-- ---------------------------------------------------------------------------
-- Y las que vengan
-- ---------------------------------------------------------------------------
create or replace function public.respetar_numero_del_recurso()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $numero$
declare
  v_puestos integer;
  v_desde   time;
  v_hasta   time;
begin
  -- Una reserva rechazada o cancelada no ocupa nada.
  if new.estado in ('rechazada', 'cancelada') then
    return new;
  end if;

  select coalesce(z.cupos_simultaneos, 1) into v_puestos
  from public.zona_comun z where z.id = new.zona_id;

  -- Una zona de un solo puesto no numera nada: no hay nada que elegir.
  if coalesce(v_puestos, 1) <= 1 then
    return new;
  end if;

  -- El mismo cerrojo que los cupos, y por el mismo motivo: sin el, dos altas
  -- simultaneas ven las dos el puesto libre y pasan las dos.
  perform pg_advisory_xact_lock(
    hashtext(new.zona_id::text || '|' || new.fecha::text));

  -- Sin numero, se asigna el primero libre. Es lo que haria quien atiende la
  -- lavanderia, y deja la fila diciendo **cual** ocupa: mientras hubo filas
  -- sin numero, el contador de la pantalla y el desplegable de puestos
  -- contaban cosas distintas y se contradecian a la vista.
  if new.numero_recurso is null then
    new.numero_recurso := public.primer_puesto_libre(
      new.zona_id, new.fecha, new.hora_inicio, new.hora_fin, new.id);
    -- Si no queda ninguno, se deja pasar sin numero: quien rechaza por falta
    -- de sitio es el disparador de cupos, y que dos digan lo mismo con
    -- mensajes distintos solo confunde.
    return new;
  end if;

  if new.numero_recurso > v_puestos then
    raise exception 'Esta zona tiene % puesto(s); no existe el N°%.',
      v_puestos, new.numero_recurso
      using errcode = 'check_violation',
            constraint = 'reserva_zona_numero_inexistente';
  end if;

  -- Se guardan las horas **de la reserva que estorba**, no las que se piden.
  -- Un mensaje que dice «ya esta reservado de 06:30 a 07:30» cuando la que
  -- choca es de 06:00 a 07:00 manda a mirar la franja equivocada.
  select r.hora_inicio, r.hora_fin into v_desde, v_hasta
  from public.reserva_zona r
  where r.zona_id = new.zona_id
    and r.fecha = new.fecha
    and r.numero_recurso = new.numero_recurso
    and r.id <> new.id
    and r.estado not in ('rechazada', 'cancelada')
    and r.hora_inicio < new.hora_fin
    and new.hora_inicio < r.hora_fin
  order by r.hora_inicio
  limit 1;

  if v_desde is not null then
    raise exception 'El N°% ya esta reservado de % a % el %.',
      new.numero_recurso,
      to_char(v_desde, 'HH24:MI'), to_char(v_hasta, 'HH24:MI'),
      to_char(new.fecha, 'DD/MM/YYYY')
      using errcode = 'check_violation',
            constraint = 'reserva_zona_numero_ocupado';
  end if;

  return new;
end;
$numero$;

comment on function public.respetar_numero_del_recurso() is
  'En una zona de varios puestos, toda reserva viva acaba con numero: el que pida, o el primero libre. Dos no comparten puesto y hora.';
