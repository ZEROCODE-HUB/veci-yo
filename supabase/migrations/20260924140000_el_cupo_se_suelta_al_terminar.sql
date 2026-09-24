-- ----------------------------------------------------------------------------
-- El cupo de visita se suelta cuando la visita termina
-- ----------------------------------------------------------------------------
-- Asignar un estacionamiento de visita funciona: la pantalla escribe en
-- `asignacion_estacionamiento`. Soltarlo **no lo hacia nadie**.
-- `liberarEstacionamiento` estaba escrita en el repositorio y ninguna pantalla
-- la llamaba, y no habia boton para ello.
--
-- Un cupo prestado que no se devuelve se acumula: el condominio de prueba
-- tiene **un** estacionamiento de visita, asi que basta un visitante para que
-- el siguiente no tenga donde aparcar, aunque el primero se haya ido hace
-- semanas. Con veinte cupos el problema tarda mas en aparecer y es igual de
-- real.
--
-- Se suelta solo, al terminar la visita, y no con un boton. Dos razones:
--
--   * Es cuando de verdad queda libre. Un cupo se presta **mientras dura la
--     visita**, y el dato que dice que la visita termino ya existe desde
--     20260924100000: `visita.estado = 'finalizada'`.
--   * Pedirle al guardia que se acuerde de soltarlo es pedirle que haga el
--     trabajo de la base. Se olvidaria, y el sintoma --"no quedan cupos"--
--     aparece semanas despues y muy lejos de la causa.
--
-- Una visita cancelada tambien lo suelta: nadie va a venir.
--
-- Que un guardia pueda soltarlo a mano ademas de esto es otra conversacion
-- --por ejemplo, si el visitante mueve el coche antes de irse--, y es decision
-- de producto. Queda anotada, no decidida aqui.

create or replace function public.soltar_cupo_al_terminar()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.estado in ('finalizada', 'cancelada')
     and old.estado is distinct from new.estado then
    update public.asignacion_estacionamiento a
       set liberado_en = coalesce(new.salida_en, now()),
           updated_at  = now()
     where a.visita_id = new.id
       and a.liberado_en is null;
  end if;

  return new;
end;
$$;

comment on function public.soltar_cupo_al_terminar() is
  'Suelta los cupos de visita cuando la visita termina o se cancela. Sin esto, un cupo asignado quedaba ocupado para siempre: nadie liberaba.';

drop trigger if exists visita_soltar_cupo on public.visita;

create trigger visita_soltar_cupo
after update of estado
on public.visita
for each row
execute function public.soltar_cupo_al_terminar();


-- Las visitas que ya terminaron y se quedaron con el cupo cogido. Se sueltan
-- con la hora de salida de la visita, que es cuando dejaron de ocuparlo.
update public.asignacion_estacionamiento a
   set liberado_en = coalesce(v.salida_en, v.updated_at, now()),
       updated_at = now()
from public.visita v
where v.id = a.visita_id
  and a.liberado_en is null
  and v.estado in ('finalizada', 'cancelada');
