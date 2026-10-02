-- ----------------------------------------------------------------------------
-- Una torre con viviendas dentro no se borra
-- ----------------------------------------------------------------------------
-- El borrado de una torre es logico --marca `deleted_at`, no borra la fila--,
-- que es lo correcto. Lo que no habia era **nada que mirase si la torre estaba
-- vacia**: ni disparador, ni comprobacion en la pantalla.
--
-- Y las dos listas se filtran por su propio `deleted_at`, asi que las viviendas
-- de una torre borrada **siguen vivas y dejan de verse**: no salen en
-- Arquitectura porque su torre ya no esta, y no hay ninguna pantalla desde la
-- que recuperarlas. El dia que se reutilice el numero de torre aparecerian
-- colgando de otra.
--
-- Encontrado el 26/09/2026 (REVISAR-A-OJO 36) y decidido por el cliente el
-- 02/10/2026: **se impide**, y se le dice que vacie la torre primero.
--
-- Se mira en la base y no en la pantalla por lo de siempre: borrar una torre se
-- puede pedir por la API, y lo que esto protege son las viviendas de un
-- edificio entero.

create or replace function public.no_borrar_torre_con_viviendas()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare
  v_viviendas integer;
begin
  -- Solo al **borrar**: cualquier otro cambio sobre la torre no tiene que ver.
  if new.deleted_at is null or old.deleted_at is not null then
    return new;
  end if;

  select count(*) into v_viviendas
  from public.unidad u
  where u.torre_id = new.id
    and u.deleted_at is null;

  if v_viviendas > 0 then
    raise exception
      'Esta torre todavia tiene % vivienda(s). Elimina primero sus viviendas y despues la torre.',
      v_viviendas
      using errcode = 'check_violation',
            constraint = 'torre_con_viviendas';
  end if;

  return new;
end;
$fn$;

comment on function public.no_borrar_torre_con_viviendas() is
  'Impide dar de baja una torre que todavia tiene viviendas vivas. Sin esto quedaban huerfanas: siguen existiendo y ninguna pantalla las muestra.';

drop trigger if exists torre_con_viviendas on public.torre;

create trigger torre_con_viviendas
  before update on public.torre
  for each row execute function public.no_borrar_torre_con_viviendas();
