-- ----------------------------------------------------------------------------
-- El numero de la reserva lo pone la base
-- ----------------------------------------------------------------------------
-- `zonas.repo.ts` lo sorteaba en el cliente:
--
--   numero: datos.numero ?? `R-${Date.now().toString().slice(-6)}`
--
-- Son los ultimos seis digitos del reloj, que se repiten **cada mil
-- segundos** --diecisiete minutos--. Dos personas reservando a la vez, o la
-- misma persona dos veces en dias distintos a la misma hora del reloj, sacan
-- el mismo numero. Y ese numero es lo que se le muestra al confirmar y lo que
-- cita quien llama a la administracion.
--
-- Es exactamente el mismo defecto que ya se corrigio en `reclamo` --donde se
-- sorteaba con `Math.random()`-- y se corrige igual: una secuencia. La
-- diferencia es que aqui el numero tampoco era unico en la tabla, asi que dos
-- reservas podian compartirlo sin que nada avisara.

create sequence if not exists public.reserva_numero_seq;

create or replace function public.asignar_numero_reserva()
returns trigger
language plpgsql
as $$
begin
  if new.numero is null or new.numero = '' then
    new.numero := lpad(nextval('public.reserva_numero_seq')::text, 6, '0');
  end if;
  return new;
end;
$$;

drop trigger if exists reserva_zona_numerar on public.reserva_zona;
create trigger reserva_zona_numerar
  before insert on public.reserva_zona
  for each row execute function public.asignar_numero_reserva();

comment on column public.reserva_zona.numero is
  'El numero visible de la reserva, que es lo que se cita al preguntar por ella. Lo asigna la base: el cliente lo sorteaba con los ultimos seis digitos del reloj.';

-- Las que ya existen con un numero sorteado se dejan como estan: cambiarlas
-- rompería la referencia de quien ya lo tiene apuntado. La secuencia arranca
-- por encima para no chocar con ellas.
select setval(
  'public.reserva_numero_seq',
  greatest(
    (select coalesce(max(numero::bigint), 0) from public.reserva_zona
      where numero ~ '^[0-9]+$'),
    1000
  )
);

-- Y que no se repita de ahora en adelante.
create unique index if not exists reserva_zona_numero_unico
  on public.reserva_zona (numero) where numero is not null;
