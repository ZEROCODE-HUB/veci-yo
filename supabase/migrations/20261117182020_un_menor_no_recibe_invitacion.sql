-- Un menor de edad no recibe invitación a la app (17/11/2026).
--
-- Decisión del cliente: al invitar a un residente no se pide fecha de
-- nacimiento; basta con marcar «Es menor de edad». Y a un menor no se le crea
-- cuenta: ni correo, ni invitación, ni app.
--
-- La base ya lo sujetaba casi todo:
--   · `membresia_unidad_menor_sin_acceso` (check): un menor no tiene cuenta ni
--     acceso;
--   · `proteger_menor_de_edad`: la marca de menor no se quita;
--   · `dar_acceso_a_la_app` rechaza a un menor, y al aceptar no se une una
--     cuenta a la fila de un menor.
-- Faltaba que una invitación no pudiera apuntar a la membresía de un menor
-- por otro camino: si llegaba a existir, al aceptarla se creaba una persona
-- nueva con cuenta en la vivienda. Ahora no se puede emitir.
--
-- Solo aditiva: una función y un disparador nuevos.

create or replace function public.invitacion_no_es_para_un_menor()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.membresia_unidad_id is not null and exists (
    select 1 from public.membresia_unidad m
     where m.id = new.membresia_unidad_id and m.es_menor
  ) then
    raise exception 'Un menor de edad no puede tener cuenta en la app';
  end if;
  return new;
end;
$$;

comment on function public.invitacion_no_es_para_un_menor() is
  'Disparador (17/11/2026): una invitación no puede apuntar a la membresía de un menor de edad. Interna.';

revoke all on function public.invitacion_no_es_para_un_menor() from public, anon, authenticated;

drop trigger if exists invitacion_no_es_para_un_menor on public.invitacion;
create trigger invitacion_no_es_para_un_menor
  before insert or update of membresia_unidad_id on public.invitacion
  for each row execute function public.invitacion_no_es_para_un_menor();
