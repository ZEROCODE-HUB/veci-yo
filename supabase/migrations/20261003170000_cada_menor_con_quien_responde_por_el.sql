-- ----------------------------------------------------------------------------
-- Cada menor, con quien responde por el
-- ----------------------------------------------------------------------------
-- Hoy `es_menor` es **una casilla que marca quien teclea**, y no hay ninguna
-- forma de decir quien se hace cargo del niño. Buscando `parentesco`, `tutor` o
-- `acudiente` en todo el esquema salen cero resultados.
--
-- Lo decidio el cliente el 02/10/2026, con estas palabras: «Menores sin padre o
-- madre siempre pedir documentacion del responsable pues!». El KT solo tenia
-- que un menor no tiene acceso a la aplicacion --sesion del 01/07, `[DECIDIDO]`--
-- y que los terminos para menores quedaron pendientes de abogado; del
-- parentesco no decia nada.
--
-- Tres cosas, y la tercera es la que de verdad importa:
--
--   1. `responsable_id` y `parentesco`, para poder decirlo.
--   2. `es_menor` **deja de ser una casilla libre**: cuando hay fecha de
--      nacimiento, la base la calcula. Hasta hoy nadie impedia marcar a un
--      adulto como menor, y `guardar_acompanante` le perdona el documento
--      justamente a los menores: la casilla era la puerta para entrar sin
--      identificarse.
--   3. El responsable tiene que ser un adulto **de la misma estancia**. Una
--      clave foranea no sabe comprobar eso, asi que va en un disparador.
--
-- Aditiva: ninguna columna se borra y ninguna fila se toca. Lo que ya estaba
-- marcado como menor sigue estandolo --no hay fecha de nacimiento para
-- recalcularlo, y adivinarla seria inventarse el dato de alguien--.

-- 1. Como se llama lo que une a un menor con quien responde por el ------------

do $$
begin
  if not exists (select 1 from pg_type where typname = 'parentesco') then
    create type public.parentesco as enum ('padre', 'madre', 'tutor_legal', 'otro');
  end if;
end
$$;

comment on type public.parentesco is
  'Que es el responsable del menor. Padre y madre no necesitan papel; tutor legal y «otro», si: es lo que pidio el cliente el 02/10/2026.';

alter table public.invitado
  add column if not exists responsable_id uuid
    references public.invitado(id) on delete set null,
  add column if not exists parentesco public.parentesco;

comment on column public.invitado.responsable_id is
  'Quien responde por este menor, y es otro invitado de la MISMA estancia. `on delete set null` y no cascade: si se quita al adulto, el niño no desaparece de la lista --se queda sin responsable, que es justo lo que hay que ver antes de cerrar--.';

comment on column public.invitado.parentesco is
  'Que es el responsable del menor. Solo tiene sentido con `responsable_id` puesto.';

create index if not exists invitado_responsable_idx
  on public.invitado (responsable_id) where responsable_id is not null;

-- Un parentesco sin responsable no dice nada, y un responsable de alguien que
-- no es menor tampoco. `not valid` porque las filas de hoy no se tocan.
alter table public.invitado
  drop constraint if exists invitado_responsable_coherente;

alter table public.invitado
  add constraint invitado_responsable_coherente
  check (
    (responsable_id is null and parentesco is null)
    or (responsable_id is not null and parentesco is not null and es_menor)
  ) not valid;

-- 2. `es_menor` sale de la fecha, no de la casilla ----------------------------

/*
  Contra `visita.fecha_desde` y no contra hoy: quien cumple dieciocho entre que
  hace el preregistro y que llega entra como adulto, y quien los cumple
  **despues** de la estancia es menor todo el tiempo que esta dentro. Lo que
  importa es la edad el dia que cruza la puerta.
*/
create or replace function public.edad_al_llegar(p_invitado public.invitado)
returns int
language sql
stable
set search_path = public, pg_temp
as $fn$
  select case
    when p_invitado.fecha_nacimiento is null then null
    else extract(year from age(
      coalesce(
        (select v.fecha_desde from public.visita v where v.id = p_invitado.visita_id),
        current_date
      ),
      p_invitado.fecha_nacimiento
    ))::int
  end;
$fn$;

comment on function public.edad_al_llegar is
  'Que edad tiene esta persona el dia que empieza su estancia. Null si no dijo su fecha de nacimiento.';

create or replace function public.menor_segun_su_fecha()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $fn$
declare
  v_edad int;
begin
  if new.fecha_nacimiento is null then
    -- Sin fecha no hay nada que calcular: se respeta lo que venga marcado. Es
    -- el caso de todo lo que ya existe y de quien no la quiere dar.
    return new;
  end if;

  v_edad := public.edad_al_llegar(new);

  if v_edad < 0 then
    raise exception 'Esa fecha de nacimiento es posterior a la llegada';
  end if;

  new.es_menor := v_edad < 18;

  -- Un adulto no tiene responsable. Si deja de ser menor al corregir su fecha,
  -- lo que colgaba de eso se cae solo, porque si no la restriccion de arriba
  -- rechazaria la fila entera y el mensaje no explicaria nada.
  if not new.es_menor then
    new.responsable_id := null;
    new.parentesco := null;
  end if;

  return new;
end;
$fn$;

drop trigger if exists invitado_menor_segun_su_fecha on public.invitado;

create trigger invitado_menor_segun_su_fecha
  before insert or update of fecha_nacimiento, es_menor on public.invitado
  for each row execute function public.menor_segun_su_fecha();

comment on function public.menor_segun_su_fecha is
  'Quien dice su fecha de nacimiento no elige ademas si es menor. Va en disparador y no en politica: RLS no sabe comparar una columna con otra de la misma fila.';

-- 3. El responsable es un adulto de la misma estancia -------------------------

create or replace function public.responsable_valido()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $fn$
declare
  v_resp public.invitado%rowtype;
begin
  if new.responsable_id is null then
    return new;
  end if;

  if new.responsable_id = new.id then
    raise exception 'Nadie puede responder por si mismo';
  end if;

  select * into v_resp from public.invitado where id = new.responsable_id;

  if v_resp.id is null or v_resp.visita_id <> new.visita_id then
    raise exception 'Quien responde por un menor tiene que estar en la misma reserva';
  end if;

  if v_resp.es_menor then
    raise exception 'Un menor no puede responder por otro menor';
  end if;

  return new;
end;
$fn$;

drop trigger if exists invitado_responsable_valido on public.invitado;

create trigger invitado_responsable_valido
  before insert or update of responsable_id on public.invitado
  for each row execute function public.responsable_valido();

comment on function public.responsable_valido is
  'El responsable llega como un uuid desde fuera. Sin esto se podria apuntar a cualquier invitado de cualquier otra estancia, o a otro niño.';
