-- ----------------------------------------------------------------------------
-- Consumo de verificaciones de antecedentes
-- ----------------------------------------------------------------------------
-- La pantalla de Visitas mostraba el consumo del paquete con cuatro numeros
-- fijos en el cliente: 20 incluidas, 5 usadas, 10 suplementarias y un
-- vencimiento del 27/10/2026. Son los numeros que deciden si un anfitrion
-- puede recibir al siguiente huesped, asi que inventarlos no es un detalle
-- cosmetico.
--
-- Las tres piezas ya existen y se cruzan aqui:
--   `suscripcion_renta_corta.verificaciones_base`  las que trae la suscripcion
--   `paquete_verificaciones`                        las compradas aparte
--   `verificacion_antecedentes`                     las consumidas

create or replace function public.consumo_verificaciones(p_unidad_id uuid)
returns table (
  incluidas                  int,
  suscritas_usadas           int,
  suplementarias             int,
  suplementarias_usadas      int,
  vencimiento_suplementarias date
)
language sql
stable
security definer
set search_path = public
as $$
  select
    coalesce(s.verificaciones_base, 0),
    (select count(*)::int
       from public.verificacion_antecedentes v
      where v.unidad_id = p_unidad_id
        and v.origen = 'paquete_base'),
    -- Solo los paquetes vigentes: uno vencido no suma saldo.
    coalesce((select sum(p.cantidad)::int
       from public.paquete_verificaciones p
      where p.unidad_id = p_unidad_id
        and (p.vence_en is null or p.vence_en >= current_date)), 0),
    (select count(*)::int
       from public.verificacion_antecedentes v
      where v.unidad_id = p_unidad_id
        and v.origen = 'paquete_complementario'),
    (select max(p.vence_en)
       from public.paquete_verificaciones p
      where p.unidad_id = p_unidad_id
        and (p.vence_en is null or p.vence_en >= current_date))
  from public.suscripcion_renta_corta s
  where s.unidad_id = p_unidad_id
    and public.puede_operar_unidad(p_unidad_id);
$$;

comment on function public.consumo_verificaciones(uuid) is
  'Verificaciones incluidas, compradas y consumidas de una unidad. Solo la ve quien opera esa vivienda.';

revoke all on function public.consumo_verificaciones(uuid) from public;
grant execute on function public.consumo_verificaciones(uuid) to authenticated;
