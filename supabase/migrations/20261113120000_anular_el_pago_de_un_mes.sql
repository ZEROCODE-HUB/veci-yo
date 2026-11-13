-- Deshacer un pago marcado por error (13/11/2026, observación del tester).
--
-- En Directorio › Pagos, la casilla «Pagado» registra de una vez todo lo que
-- falta del mes, y una vez marcada no se podía desmarcar: si la
-- administración se equivocaba de vivienda, no había forma de devolverla a
-- «No pagado». Esta función borra lo registrado de ese mes para esa vivienda
-- (sus abonos y su fila de pago), y la vivienda vuelve a deber el mes entero.
-- Solo la administración del edificio. Solo aditiva: función nueva.

create or replace function public.anular_pago_de_cuota(p_cuota_id uuid, p_unidad_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_condominio uuid;
begin
  select c.condominio_id into v_condominio from public.cuota_administracion c where c.id = p_cuota_id;
  if v_condominio is null or not public.es_admin_condominio(v_condominio) then
    raise exception 'Solo la administración anula los pagos';
  end if;
  if public.condominio_de_unidad(p_unidad_id) is distinct from v_condominio then
    raise exception 'Esa vivienda no es de este condominio';
  end if;

  delete from public.abono_cuota where cuota_id = p_cuota_id and unidad_id = p_unidad_id;
  delete from public.pago_cuota where cuota_id = p_cuota_id and unidad_id = p_unidad_id;
end;
$$;

revoke execute on function public.anular_pago_de_cuota(uuid, uuid) from public, anon;
grant execute on function public.anular_pago_de_cuota(uuid, uuid) to authenticated, service_role;
comment on function public.anular_pago_de_cuota(uuid, uuid) is
  'Deshace lo registrado de un mes para una vivienda (abonos y pago): para un pago marcado por error. Solo la administración (13/11/2026).';
