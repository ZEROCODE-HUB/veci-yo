-- Una zona comun inactiva no se reserva (17/10/2026).
--
-- `zona_comun.activa` se guardaba desde el formulario de la administracion y
-- solo pintaba la etiqueta «Inactiva»: ninguna politica ni funcion la miraba,
-- asi que una zona apagada se seguia viendo y se podia reservar.
--
-- El disparador mira solo las altas y los cambios de zona. Lo que ya estaba
-- reservado se puede seguir cancelando o resolviendo: apagar una zona no deja
-- a nadie con una reserva que no puede soltar.

create or replace function public.reservar_solo_zonas_activas()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
begin
  if new.estado in ('cancelada', 'rechazada') then
    return new;
  end if;

  if exists (
    select 1 from public.zona_comun z
    where z.id = new.zona_id and z.activa is false
  ) then
    raise exception 'Esta zona no está disponible para reservas'
      using errcode = 'check_violation', constraint = 'reserva_zona_zona_inactiva';
  end if;

  return new;
end;
$function$;

revoke execute on function public.reservar_solo_zonas_activas() from public, anon, authenticated;

create trigger reserva_zona_zona_activa
  before insert or update of zona_id on public.reserva_zona
  for each row execute function public.reservar_solo_zonas_activas();

comment on function public.reservar_solo_zonas_activas() is
  'Una zona con activa = false no admite reservas nuevas; las ya hechas se pueden cancelar.';
