-- ---------------------------------------------------------------------------
-- El aforo de una zona lo sujeta la base
-- ---------------------------------------------------------------------------
-- `zona_comun.capacidad_maxima` se respetaba **solo en la pantalla**:
-- `opcionesDeAsistentes` recorta el desplegable para que el titular mas sus
-- acompañantes no pasen del aforo, y eso tiene sus pruebas. Pero la reserva se
-- crea por API, y la base no tenia ni un `check` ni un disparador: se le pidieron
-- **200 acompañantes en una zona de 20** por PostgREST y los acepto sin
-- inmutarse.
--
-- Es la forma exacta del defecto que mas veces ha salido en este proyecto: la
-- decision vivia en la pantalla y no en el dato. Y la regla del repositorio es
-- clara --lo que expresa un limite necesita que la base lo sujete--, porque
-- cualquiera puede llamar a la API sin pasar por ninguna pantalla.
--
-- Un `check` no sirve: la capacidad esta en otra tabla. Va en un disparador.
--
-- Criterio, que es el que la pantalla ya aplica: **el titular ocupa sitio**, asi
-- que caben `capacidad_maxima - 1` acompañantes. Una capacidad vacia o en cero
-- no limita nada: hay zonas donde ese numero significa otra cosa --en la
-- lavanderia parece ser el numero de lavadoras, y esta anotado como duda en
-- `REVISAR-A-OJO.md`-- y bloquear por un dato ambiguo seria peor que no hacerlo.
--
-- No se toca ninguna fila: hoy ninguna reserva pasa del aforo de su zona.

create or replace function public.respetar_aforo_de_zona()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $aforo$
declare
  v_capacidad integer;
begin
  select capacidad_maxima into v_capacidad
    from public.zona_comun where id = new.zona_id;

  -- Sin capacidad declarada no hay nada que comprobar.
  if coalesce(v_capacidad, 0) <= 0 then
    return new;
  end if;

  if coalesce(new.acompanantes, 0) + 1 > v_capacidad then
    raise exception
      'La zona admite % personas contando a quien reserva, y se pidieron %',
      v_capacidad, coalesce(new.acompanantes, 0) + 1
      using errcode = 'check_violation';
  end if;

  return new;
end
$aforo$;

comment on function public.respetar_aforo_de_zona is
  'Impide que una reserva pase del aforo de su zona. El titular cuenta, igual que en la pantalla. Una capacidad vacia o en cero no limita (29/09/2026).';

drop trigger if exists reserva_zona_aforo on public.reserva_zona;
create trigger reserva_zona_aforo
  before insert or update of acompanantes, zona_id on public.reserva_zona
  for each row execute function public.respetar_aforo_de_zona();
