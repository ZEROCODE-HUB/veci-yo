-- ---------------------------------------------------------------------------
-- La lavadora tiene número
-- ---------------------------------------------------------------------------
-- El formulario de reserva pide «Seleccione N° de Lavanderia» y no deja
-- reservar sin elegir uno. Ese número no se guardaba en ninguna parte:
-- `reserva_zona` no tenía columna y la consulta no lo mandaba. Se comprueba
-- solo --se reservó la N°1 a las 06:00 y al volver a esa misma franja la N°1
-- seguía ofreciéndose--, y es el mismo defecto de siempre: un campo
-- obligatorio que se tira.
--
-- Hasta hoy la zona contaba cupos: `cupos_simultaneos` dice cuántas reservas
-- caben a la vez --cuatro en la lavandería, que tiene cuatro lavadoras-- y un
-- disparador lo impone. Eso impide que entren cinco, pero no que dos vecinos
-- se presenten los dos a la lavadora N°1.
--
-- Decisión del cliente (25/09/2026): se asigna por número. Así que el número
-- se guarda, y **dos reservas vivas no pueden compartir número y hora** en la
-- misma zona y el mismo día.
--
-- No se usa `EXCLUDE`, por lo mismo que la migración de los cupos: las
-- reservas que ya hay en la base se solapan entre sí a miles --son de prueba--
-- y una restricción de tabla ni se podría crear. El disparador solo mira lo
-- que se escribe de ahora en adelante.
alter table public.reserva_zona
  add column if not exists numero_recurso integer;

alter table public.reserva_zona
  drop constraint if exists reserva_zona_numero_recurso_positivo;
alter table public.reserva_zona
  add constraint reserva_zona_numero_recurso_positivo
  check (numero_recurso is null or numero_recurso > 0);

comment on column public.reserva_zona.numero_recurso is
  'Cual de los puestos de la zona se reservo: la lavadora N°2, por ejemplo. Nulo en las reservas anteriores a que esto se guardara, y en las zonas de un solo puesto.';


-- ---------------------------------------------------------------------------
-- Ese número, a esa hora, no lo tiene nadie más
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
  -- Una reserva rechazada o cancelada no ocupa nada, y una sin numero --las
  -- de antes de esta migracion, y las zonas de un solo puesto-- no tiene nada
  -- que comprobar.
  if new.estado in ('rechazada', 'cancelada') or new.numero_recurso is null then
    return new;
  end if;

  select coalesce(z.cupos_simultaneos, 1) into v_puestos
  from public.zona_comun z where z.id = new.zona_id;

  if new.numero_recurso > coalesce(v_puestos, 1) then
    raise exception 'Esta zona tiene % puesto(s); no existe el N°%.',
      coalesce(v_puestos, 1), new.numero_recurso
      using errcode = 'check_violation',
            constraint = 'reserva_zona_numero_inexistente';
  end if;

  -- El mismo cerrojo que los cupos, y por el mismo motivo: sin el, dos altas
  -- simultaneas ven las dos el puesto libre y pasan las dos.
  perform pg_advisory_xact_lock(
    hashtext(new.zona_id::text || '|' || new.fecha::text));

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
  'Dos reservas vivas no comparten puesto y hora. El limite vive aqui y no en la pantalla: cualquiera puede llamar a la API.';

drop trigger if exists reserva_zona_respetar_numero on public.reserva_zona;
create trigger reserva_zona_respetar_numero
  before insert or update of zona_id, fecha, hora_inicio, hora_fin, estado,
                             numero_recurso
  on public.reserva_zona
  for each row execute function public.respetar_numero_del_recurso();


-- ---------------------------------------------------------------------------
-- La grilla necesita saber que numeros estan cogidos
-- ---------------------------------------------------------------------------
-- Y no puede deducirlo: `reserva_zona_lectura` solo entrega a cada quien sus
-- propias reservas, asi que el desplegable ofrecia los cuatro numeros aunque
-- tres estuvieran tomados. Se anade a lo que la funcion ya devolvia, que
-- sigue sin decir **de quien** es cada franja.
-- Se borra antes de crearla: anadir una columna al `returns table` cambia el
-- tipo de retorno, y `create or replace` no puede con eso.
drop function if exists public.ocupacion_zona(uuid, date, date);

create function public.ocupacion_zona(
  p_zona_id uuid,
  p_desde   date,
  p_hasta   date
)
returns table (
  fecha          date,
  hora_inicio    time,
  hora_fin       time,
  propia         boolean,
  numero_recurso integer
)
language sql
stable
security definer
set search_path = public, pg_temp
as $ocupacion$
  select r.fecha, r.hora_inicio, r.hora_fin,
         public.es_miembro_unidad(r.unidad_id)
           or r.solicitada_por = auth.uid() as propia,
         r.numero_recurso
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
$ocupacion$;

comment on function public.ocupacion_zona(uuid, date, date) is
  'Las franjas tomadas de una zona y con que numero, sin decir de quien son. La grilla y el desplegable de puestos las necesitan, y `reserva_zona_lectura` solo entrega las propias.';

revoke all on function public.ocupacion_zona(uuid, date, date) from public;
grant execute on function public.ocupacion_zona(uuid, date, date) to authenticated;
