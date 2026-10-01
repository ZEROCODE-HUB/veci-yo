-- ----------------------------------------------------------------------------
-- Resumen de recaudación por periodo
-- ----------------------------------------------------------------------------
-- El carrusel del Cuadro de Honor muestra, mes a mes, cuánto se esperaba
-- recaudar, cuánto entró y cuántas unidades están al día. Es información de
-- transparencia para toda la comunidad, pero `pago_cuota` solo deja leer a
-- quien opera la unidad (`puede_operar_unidad`): un residente no puede sumar
-- los pagos de los demás, y no debe poder hacerlo.
--
-- Mismo patrón que la votación secreta: se expone el agregado y nunca las
-- filas. De aquí no sale qué unidad pagó ni cuánto pagó cada una.

create or replace function public.resumen_cuotas(p_condominio_id uuid)
returns table (
  periodo     date,
  moneda      char(3),
  esperado    numeric(12,2),
  recibido    numeric(12,2),
  al_dia      int,
  atrasados   int
)
language sql
stable
security definer
set search_path = public
as $$
  select
    c.periodo,
    c.moneda,
    (c.monto * count(u.id))::numeric(12,2),
    (c.monto * count(*) filter (where p.pagado))::numeric(12,2),
    count(*) filter (where p.pagado)::int,
    count(*) filter (where p.pagado is not true)::int
  from public.cuota_administracion c
  join public.unidad u
    on u.condominio_id = c.condominio_id and u.deleted_at is null
  left join public.pago_cuota p
    on p.cuota_id = c.id and p.unidad_id = u.id
  where c.condominio_id = p_condominio_id
    and public.es_miembro_condominio(p_condominio_id)
  group by c.id, c.periodo, c.moneda, c.monto
  order by c.periodo desc
  limit 12;
$$;

comment on function public.resumen_cuotas(uuid) is
  'Recaudación agregada por periodo. No expone qué unidad pagó: solo totales y conteos. Requiere ser miembro del condominio.';

revoke all on function public.resumen_cuotas(uuid) from public;
grant execute on function public.resumen_cuotas(uuid) to authenticated;
