-- ============================================================================
-- Una zona con costo siempre requiere aprobación (26/11/2026)
-- ============================================================================
-- El cliente: «si al crear el usuario pone algún costo, sí o sí debe activarse
-- "Aprobación del administrador" y no debe dejar que se deseleccione». La
-- pantalla ya lo hace; aquí se sujeta en la base, para cualquier camino.
--
-- Un disparador y no una restricción: con costo, la aprobación se enciende
-- sola en vez de rechazar el guardado. Aditivo: función y disparador nuevos.

create or replace function public.zona_con_costo_requiere_aprobacion()
returns trigger
language plpgsql
set search_path to 'public', 'pg_temp'
as $$
begin
  if coalesce(new.costo_reserva, 0) > 0
     or coalesce(new.monto_garantia, 0) > 0
     or coalesce(new.costo_limpieza, 0) > 0 then
    new.requiere_aprobacion := true;
  end if;
  return new;
end;
$$;
comment on function public.zona_con_costo_requiere_aprobacion() is
  'Una zona común con costo de reserva, garantía o limpieza requiere siempre la aprobación de la administración (26/11/2026, pedido del cliente).';

drop trigger if exists zona_comun_con_costo_requiere_aprobacion on public.zona_comun;
create trigger zona_comun_con_costo_requiere_aprobacion
  before insert or update of costo_reserva, monto_garantia, costo_limpieza, requiere_aprobacion
  on public.zona_comun
  for each row execute function public.zona_con_costo_requiere_aprobacion();

-- Las que ya había con costo y sin aprobación.
update public.zona_comun
   set requiere_aprobacion = true
 where deleted_at is null
   and not requiere_aprobacion
   and (costo_reserva > 0 or monto_garantia > 0 or costo_limpieza > 0);
