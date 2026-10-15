-- El paquete extra de verificaciones dura 180 dias (15/10/2026).
--
-- El KT (2.3) describe los paquetes adicionales como un «fondo de emergencia»
-- con una ventana de 90 a 180 dias; el codigo les daba 365. El cliente eligio
-- 180. Los paquetes ya comprados conservan su fecha: esto solo cambia los que
-- se compren desde ahora.

CREATE OR REPLACE FUNCTION public.comprar_paquete_verificaciones(p_unidad_id uuid, p_cantidad integer, p_referencia text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_condominio uuid;
  v_monto  numeric(12,2);
  v_moneda char(3);
  v_id     uuid;
begin
  if not public.puede_configurar_alojamiento(p_unidad_id) then
    raise exception 'No podes comprar verificaciones para esta vivienda';
  end if;

  if p_cantidad is null or p_cantidad <= 0 then
    raise exception 'El paquete necesita una cantidad';
  end if;

  v_condominio := public.condominio_de_unidad(p_unidad_id);

  select p.monto, p.moneda into v_monto, v_moneda
  from public.precio_del_plan('paquete_verificaciones', v_condominio) p;

  insert into public.paquete_verificaciones
    (unidad_id, cantidad, vence_en, comprado_por, monto, moneda, referencia)
  values
    (p_unidad_id, p_cantidad, current_date + 180, auth.uid(),
     case when v_monto is null then null else v_monto * p_cantidad end,
     v_moneda,
     nullif(btrim(coalesce(p_referencia, '')), ''))
  returning id into v_id;

  return v_id;
end;
$function$;
