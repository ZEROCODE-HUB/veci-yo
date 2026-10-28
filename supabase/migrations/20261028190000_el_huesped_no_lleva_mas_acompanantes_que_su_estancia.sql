-- ----------------------------------------------------------------------------
-- Un huésped no lleva a una zona más acompañantes que los de su estancia
-- (28/10/2026, Para Claude 129 y T-324)
-- ----------------------------------------------------------------------------
-- Desde el hueco 42 un huésped solo puede apuntar por su nombre a las personas
-- de su estancia (`huesped_solo_apunta_a_su_estancia`). Pero el número de
-- acompañantes de la reserva iba aparte y no se miraba: Tomás, sin
-- acompañantes en su preregistro, podía reservar la piscina «con 3 personas».
--
-- La regla: cuando quien reserva es el propio huésped, los acompañantes no
-- pasan de las personas de su estancia menos él. Se libran, como en el hueco
-- 42, la administración, la portería y quien además vive en la vivienda.
-- Solo aditiva.

create or replace function public.huesped_no_lleva_mas_que_su_estancia()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_personas integer;
begin
  if auth.uid() is null
     or coalesce(new.acompanantes, 0) = 0
     or coalesce(new.solicitada_por, auth.uid()) is distinct from auth.uid()
     or not public.es_huesped_con_reserva(new.unidad_id)
     or exists (
       select 1 from public.membresia_unidad m
       where m.unidad_id = new.unidad_id and m.usuario_id = auth.uid()
         and m.activo and m.rol <> 'huesped_temporal'
     )
  then
    return new;
  end if;

  select count(*) into v_personas
  from public.nombres_de_mi_estancia(new.unidad_id);

  if new.acompanantes > greatest(v_personas - 1, 0) then
    raise exception 'Tu estancia tiene % acompañante(s) en el preregistro: no puedes llevar más a la zona.',
      greatest(v_personas - 1, 0)
      using errcode = '42501';
  end if;
  return new;
end;
$function$;

comment on function public.huesped_no_lleva_mas_que_su_estancia() is
  'Un huésped que reserva una zona común no lleva más acompañantes que las personas de su estancia menos él. La administración, la portería y quien vive en la vivienda no tienen ese límite. Para Claude 129, 28/10/2026.';

drop trigger if exists reserva_zona_acompanantes_de_la_estancia on public.reserva_zona;
create trigger reserva_zona_acompanantes_de_la_estancia
  before insert or update of acompanantes on public.reserva_zona
  for each row execute function public.huesped_no_lleva_mas_que_su_estancia();

revoke execute on function public.huesped_no_lleva_mas_que_su_estancia() from public, anon, authenticated;
