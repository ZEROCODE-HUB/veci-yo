-- Borrar o cancelar una reserva cierra sus enlaces de preregistro.
--
-- QA 23/10/2026: el enlace de un acompañante seguía sirviendo un buen rato
-- después de eliminar la reserva. Todas las funciones del preregistro (las del
-- titular y las de los acompañantes, vía `persona_del_enlace` o directamente)
-- miran solo `visita.precheckin_expira_en > now()`; ninguna mira
-- `deleted_at` ni el estado. En vez de tocar las veintitantas, la reserva que
-- se borra o se cancela vence su enlace en ese momento, y todas lo respetan.

create or replace function public.cerrar_enlaces_de_reserva_terminada()
returns trigger
language plpgsql
set search_path to 'public', 'pg_temp'
as $$
begin
  if (new.deleted_at is not null and old.deleted_at is null)
     or (new.estado = 'cancelada' and old.estado is distinct from 'cancelada') then
    if new.precheckin_expira_en is null or new.precheckin_expira_en > now() then
      new.precheckin_expira_en := now();
    end if;
  end if;
  return new;
end;
$$;

comment on function public.cerrar_enlaces_de_reserva_terminada() is
  'Al borrar o cancelar una reserva, vence su enlace de preregistro (y con él '
  'los de sus acompañantes, que dependen de la misma fecha).';

drop trigger if exists visita_cierra_enlaces_al_terminar on public.visita;
create trigger visita_cierra_enlaces_al_terminar
  before update of deleted_at, estado on public.visita
  for each row
  execute function public.cerrar_enlaces_de_reserva_terminada();

-- Las que ya estaban borradas o canceladas con el enlace vivo.
update public.visita
   set precheckin_expira_en = now()
 where (deleted_at is not null or estado = 'cancelada')
   and precheckin_expira_en > now();
