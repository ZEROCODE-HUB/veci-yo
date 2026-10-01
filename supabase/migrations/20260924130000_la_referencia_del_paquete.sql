-- ----------------------------------------------------------------------------
-- La referencia de un paquete de verificaciones no se guardaba
-- ----------------------------------------------------------------------------
-- `comprar_paquete_verificaciones` acepta `p_referencia` desde que se escribio
-- (20260923400000) y **no la guarda en ninguna parte**: la tabla no tiene esa
-- columna y el `insert` no la menciona. El parametro entra y se pierde.
--
-- La aplicacion lo pasa --`comprarPaqueteVerificaciones` reenvia
-- `params.referencia`--, asi que quien lo lea da por hecho que queda
-- registrado. Es un parametro decorativo: la misma familia que las casillas
-- que la pantalla respetaba y la base no.
--
-- Y aqui importa mas de lo normal. El cobro de un paquete va **fuera de la
-- aplicacion** --como la suscripcion, y mientras no haya pasarela, simulado--,
-- asi que la referencia es lo unico que permite casar esta fila con el pago
-- que la origino. Sin ella, un paquete comprado es un importe sin justificar.

alter table public.paquete_verificaciones
  add column if not exists referencia text;

comment on column public.paquete_verificaciones.referencia is
  'Referencia del pago que origino el paquete. El cobro ocurre fuera de la aplicacion, asi que esto es lo unico que permite conciliarlo.';


-- Se recrea la funcion con el mismo cuerpo, guardando la referencia.
create or replace function public.comprar_paquete_verificaciones(
  p_unidad_id  uuid,
  p_cantidad   integer,
  p_referencia text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_condominio uuid;
  v_monto  numeric(12,2);
  v_moneda char(3);
  v_id     uuid;
begin
  if not public.puede_operar_unidad(p_unidad_id) then
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
    (p_unidad_id, p_cantidad, current_date + 365, auth.uid(),
     case when v_monto is null then null else v_monto * p_cantidad end,
     v_moneda,
     nullif(btrim(coalesce(p_referencia, '')), ''))
  returning id into v_id;

  return v_id;
end;
$$;

comment on function public.comprar_paquete_verificaciones(uuid, integer, text) is
  'Compra un paquete de verificaciones para una vivienda. El cobro va fuera de la aplicacion, y `p_referencia` es lo que permite conciliarlo: antes se aceptaba y se tiraba.';
