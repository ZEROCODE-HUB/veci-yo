-- ----------------------------------------------------------------------------
-- Una visita que ya entró no la borra el vecino (26/10/2026)
-- ----------------------------------------------------------------------------
-- Decidido el 12/10/2026: una visita que ya entró es constancia de quién
-- estuvo en el edificio, y el vecino no la borra. La pantalla lo respetaba
-- --el menú solo ofrece «Eliminar» en una visita programada, salvo a la
-- administración-- y la base no: `visita_baja` deja borrar a cualquiera que
-- opere la vivienda, y la app «borra» poniendo `deleted_at`, que es un UPDATE
-- y ni siquiera pasa por esa política. Lo encontró la revisión de pendientes
-- de REVISAR-A-OJO (punto 195): la decisión vivía en la pantalla, no en el dato.
--
-- La regla, igual que la pantalla:
--   · solo visitas corrientes --amigos, temporal, permanente--: una estancia de
--     huésped la gestiona su anfitrión, que puede retirarla;
--   · solo si ya entró: `ingresada` o `finalizada`;
--   · el personal del edificio (administración y portería) sí puede, como hoy;
--   · la clave de servicio (`auth.uid()` nulo) también: siembra y limpia.
--
-- Cubre los dos caminos: poner `deleted_at` y el DELETE directo por PostgREST.
-- Solo aditiva: no cambia ninguna política.

create or replace function public.una_visita_que_entro_no_la_borra_el_vecino()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  -- En un UPDATE solo cuenta si se está retirando; en un DELETE, siempre.
  se_retira boolean;
begin
  if tg_op = 'DELETE' then
    se_retira := true;
  else
    se_retira := new.deleted_at is not null;
  end if;

  if se_retira
     and auth.uid() is not null
     and old.tipo <> 'huesped_temporal'
     and old.estado in ('ingresada', 'finalizada')
     and old.deleted_at is null
     and not public.es_personal_condominio(old.condominio_id)
  then
    raise exception 'Esta visita ya entró al edificio y queda como constancia: no se puede borrar.'
      using errcode = '42501';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$function$;

comment on function public.una_visita_que_entro_no_la_borra_el_vecino() is
  'Un vecino no borra (ni con deleted_at ni con DELETE) una visita corriente que ya entró: es constancia. El personal del edificio y la clave de servicio sí. Decisión del 12/10/2026.';

drop trigger if exists visita_que_entro_no_se_borra on public.visita;
create trigger visita_que_entro_no_se_borra
  before update of deleted_at or delete on public.visita
  for each row execute function public.una_visita_que_entro_no_la_borra_el_vecino();

revoke execute on function public.una_visita_que_entro_no_la_borra_el_vecino() from public, anon, authenticated;
