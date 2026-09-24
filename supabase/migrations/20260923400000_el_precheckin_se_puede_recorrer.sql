-- ----------------------------------------------------------------------------
-- El precheckin se puede recorrer entero
-- ----------------------------------------------------------------------------
-- Del flujo 4.2 del KT --el precheckin del huesped temporal-- faltaban tres
-- piezas, y las tres tenian su tabla hecha y nadie que la escribiera:
--
--   * **Aceptar los T&C**, y la excepcion que el anfitrion puede marcar
--     "asumiendo la responsabilidad legal" cuando el huesped no puede
--     aceptarlos --analfabetismo, discapacidad, sin lista cerrada de
--     causales--. `[DECIDIDO, con soporte en codigo]`, y el soporte era leer
--     las columnas: nadie las escribia.
--   * **La verificacion de antecedentes**, que corre "automaticamente en este
--     paso, sin intervencion del Anfitrion ni visibilidad para el huesped".
--   * **La compra de un paquete** de verificaciones cuando se acaban las que
--     trae la suscripcion.
--
-- El proveedor de verificacion sigue sin cerrarse (R-68): se evaluaron Truora,
-- Rapitra y algun otro, y el nombre del elegido no quedo registrado. Eso no
-- puede bloquear el recorrido del flujo, asi que la verificacion admite
-- ejecutarse **sin proveedor**, y entonces la fila queda marcada como
-- `simulado` para siempre. Nadie va a confundir una con otra: no es una
-- bandera de configuracion que alguien pueda olvidar, es el dato.

-- ----------------------------------------------------------------------------
-- Los terminos y condiciones
-- ----------------------------------------------------------------------------
create or replace function public.aceptar_terminos_huesped(
  p_invitado_id uuid,
  p_excepcion   boolean default false
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_unidad      uuid;
  v_es_anfitrion boolean;
  v_es_el_mismo  boolean;
begin
  select v.unidad_id into v_unidad
  from public.invitado i
  join public.visita v on v.id = i.visita_id
  where i.id = p_invitado_id;

  if v_unidad is null then
    raise exception 'Ese huesped no existe';
  end if;

  v_es_anfitrion := public.es_anfitrion_del_invitado(p_invitado_id);

  -- El propio huesped: su membresia en esa vivienda, vigente.
  v_es_el_mismo := exists (
    select 1 from public.membresia_unidad mu
    where mu.unidad_id = v_unidad
      and mu.usuario_id = auth.uid()
      and mu.activo
      and mu.rol = 'huesped_temporal'
  );

  if p_excepcion then
    -- La excepcion es del anfitrion, y solo suya: es el que asume la
    -- responsabilidad legal de haberla marcado.
    if not v_es_anfitrion then
      raise exception 'Solo el anfitrion puede aprobar los terminos por excepcion';
    end if;

    -- `terminos_aprobado_por` es un uuid: guarda **quien** la aprobo, no una
    -- etiqueta. Es lo que le da dueño a la excepcion.
    update public.invitado
       set terminos_aceptados   = true,
           terminos_excepcion   = true,
           terminos_aprobado_por = auth.uid()
     where id = p_invitado_id;
  else
    if not (v_es_el_mismo or v_es_anfitrion) then
      raise exception 'Nadie acepta los terminos en nombre de otro';
    end if;

    -- Si los acepta el propio huesped no hay nadie que "los apruebe por el":
    -- la columna queda vacia, que es justo lo que la distingue de la excepcion.
    update public.invitado
       set terminos_aceptados   = true,
           terminos_excepcion   = false,
           terminos_aprobado_por = case when v_es_el_mismo then null else auth.uid() end
     where id = p_invitado_id;
  end if;
end;
$$;

comment on function public.aceptar_terminos_huesped(uuid, boolean) is
  'Acepta los T&C de un huesped. La excepcion la marca el anfitrion, que asume la responsabilidad legal; las columnas existian y no las escribia nadie.';

revoke all on function public.aceptar_terminos_huesped(uuid, boolean) from public;
grant execute on function public.aceptar_terminos_huesped(uuid, boolean) to authenticated;


-- ----------------------------------------------------------------------------
-- La verificacion de antecedentes
-- ----------------------------------------------------------------------------
-- Descuenta del saldo que `consumo_verificaciones()` ya calcula: primero las
-- que trae la suscripcion, despues las de los paquetes comprados.
create or replace function public.verificar_antecedentes(
  p_invitado_id uuid,
  p_proveedor   text default null,
  p_referencia  text default null,
  p_resultado   public.resultado_verificacion default 'aprobada',
  p_respuesta   jsonb default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_unidad   uuid;
  v_base     int;
  v_usadas_b int;
  v_paq      int;
  v_usadas_p int;
  v_origen   public.origen_verificacion;
  v_paquete  uuid;
  v_periodo  uuid;
  v_id       uuid;
begin
  select v.unidad_id into v_unidad
  from public.invitado i
  join public.visita v on v.id = i.visita_id
  where i.id = p_invitado_id;

  if v_unidad is null then
    raise exception 'Ese huesped no existe';
  end if;

  -- Es del anfitrion: el KT dice que corre sin intervencion del huesped y sin
  -- visibilidad para el.
  if not public.es_anfitrion_del_invitado(p_invitado_id) then
    raise exception 'Solo el anfitrion del alojamiento puede pedir la verificacion';
  end if;

  if exists (select 1 from public.verificacion_antecedentes va
             where va.invitado_id = p_invitado_id
               and va.resultado <> 'error_proveedor') then
    raise exception 'Ese huesped ya tiene una verificacion'
      using errcode = 'unique_violation';
  end if;

  -- Los nombres son los que devuelve `consumo_verificaciones`: las que trae
  -- la suscripcion y las de los paquetes comprados, con lo usado de cada una.
  select incluidas, suscritas_usadas, suplementarias, suplementarias_usadas
    into v_base, v_usadas_b, v_paq, v_usadas_p
  from public.consumo_verificaciones(v_unidad);

  if v_base is null then
    raise exception 'Esta vivienda no tiene suscripcion de renta corta';
  end if;

  if coalesce(v_usadas_b, 0) < coalesce(v_base, 0) then
    v_origen := 'paquete_base';
    select ps.id into v_periodo
    from public.periodo_suscripcion ps
    join public.suscripcion_renta_corta s on s.id = ps.suscripcion_id
    where s.unidad_id = v_unidad
    order by ps.desde desc limit 1;

    -- Las verificaciones incluidas pertenecen a un periodo pagado: es lo que
    -- dice `verificacion_antecedentes_origen_coherente`, y tiene razon. Sin
    -- periodo no se sabe de que abono se descuentan.
    if v_periodo is null then
      raise exception 'Esta suscripcion no tiene ningun periodo abierto: no hay de donde descontar la verificacion'
        using errcode = 'check_violation';
    end if;
  elsif coalesce(v_usadas_p, 0) < coalesce(v_paq, 0) then
    v_origen := 'paquete_complementario';
    select p.id into v_paquete
    from public.paquete_verificaciones p
    where p.unidad_id = v_unidad
      and (p.vence_en is null or p.vence_en >= current_date)
    order by p.vence_en nulls last limit 1;
  else
    raise exception 'No quedan verificaciones disponibles. Compra un paquete.'
      using errcode = 'check_violation';
  end if;

  insert into public.verificacion_antecedentes (
    invitado_id, unidad_id, origen, periodo_id, paquete_id,
    -- Sin proveedor configurado queda dicho en el dato, no en una bandera que
    -- alguien pueda olvidar: una verificacion simulada no se confunde nunca
    -- con una de verdad.
    proveedor, resultado, referencia_externa, respuesta, ejecutada_en
  )
  values (
    p_invitado_id, v_unidad, v_origen, v_periodo, v_paquete,
    coalesce(nullif(btrim(coalesce(p_proveedor, '')), ''), 'simulado'),
    p_resultado, p_referencia, p_respuesta, now()
  )
  returning id into v_id;

  return v_id;
end;
$$;

comment on function public.verificar_antecedentes(uuid, text, text, public.resultado_verificacion, jsonb) is
  'Ejecuta la verificacion de antecedentes de un huesped y descuenta del saldo. Sin proveedor configurado la fila queda marcada como `simulado`: R-68 sigue abierto y eso no puede bloquear el recorrido del flujo.';

revoke all on function public.verificar_antecedentes(uuid, text, text, public.resultado_verificacion, jsonb) from public;
grant execute on function public.verificar_antecedentes(uuid, text, text, public.resultado_verificacion, jsonb) to authenticated;


-- ----------------------------------------------------------------------------
-- Comprar un paquete de verificaciones
-- ----------------------------------------------------------------------------
-- El precio vive en `precio_plan`, con la misma forma que la suscripcion: por
-- pais y con su moneda. El KT da una referencia de "USD 0,10-0,25 por
-- verificacion" para el coste del proveedor, que no es el precio de venta y no
-- se inventa aqui: se siembra el mismo importe que ya se sembro para el plan,
-- y el cliente lo reemplaza.
do $$
begin
  if not exists (
    select 1 from pg_enum e join pg_type t on t.oid = e.enumtypid
    where t.typname = 'clave_plan' and e.enumlabel = 'paquete_verificaciones'
  ) then
    alter type public.clave_plan add value 'paquete_verificaciones';
  end if;
end $$;

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
    (unidad_id, cantidad, vence_en, comprado_por, monto, moneda)
  values
    (p_unidad_id, p_cantidad, current_date + 365, auth.uid(),
     case when v_monto is null then null else v_monto * p_cantidad end,
     v_moneda)
  returning id into v_id;

  return v_id;
end;
$$;

comment on function public.comprar_paquete_verificaciones(uuid, integer, text) is
  'Compra un paquete de verificaciones para una vivienda. El cobro va por el mismo camino que la suscripcion: fuera de la app, y mientras no haya pasarela, simulado.';

revoke all on function public.comprar_paquete_verificaciones(uuid, integer, text) from public;
grant execute on function public.comprar_paquete_verificaciones(uuid, integer, text) to authenticated;


-- El plan del paquete y su precio. Se siembra un importe por defecto para que
-- la compra tenga algo que registrar; el del KT --"USD 0,10-0,25 por
-- verificacion"-- es el **coste del proveedor**, no el precio de venta, y ese
-- no se inventa aqui: lo pone el cliente en `precio_plan`, como el del plan.
insert into public.plan_suscripcion (clave, nombre, descripcion, periodicidad)
values (
  'paquete_verificaciones',
  'Paquete de verificaciones',
  'Verificaciones de antecedentes adicionales para una vivienda.',
  'mensual'
)
on conflict (clave) do nothing;

insert into public.precio_plan (plan_id, pais, monto, moneda)
select pl.id, null, 1.00, 'USD'
from public.plan_suscripcion pl
where pl.clave = 'paquete_verificaciones'
  and not exists (
    select 1 from public.precio_plan pr
    where pr.plan_id = pl.id and pr.pais is null and pr.vigente_hasta is null
  );
