-- ----------------------------------------------------------------------------
-- Cuadro de Honor y reconocimientos entre vecinos
-- ----------------------------------------------------------------------------
-- La pantalla mostraba cuatro departamentos inventados ("Maria Juarez" cuatro
-- veces) con estados 'Atrasado' y 'Deudor' visibles para cualquiera. Dos
-- problemas distintos al llevarlo a datos reales:
--
-- 1. Privacidad. Quien está en mora es un dato financiero personal. El cuadro
--    de honor es, por definición, la lista de quienes están al día: no tiene
--    por qué publicar lo contrario. La pantalla ya filtraba `estado = 'Al día'`
--    en el cliente, lo que significa que traía las deudas al dispositivo para
--    después esconderlas. Aquí no salen de la base.
--
-- 2. Lectura. Un residente no puede leer `membresia_unidad` de otras unidades
--    (política `membresia_unidad_lectura`), así que no hay forma de armar el
--    cuadro con consultas directas. Se resuelve con una función
--    `security definer` que expone exactamente lo que la pantalla necesita:
--    unidad, responsable e insignias. Ni montos, ni deudas, ni contactos.

create or replace function public.cuadro_honor(p_condominio_id uuid)
returns table (
  unidad_id              uuid,
  codigo                 text,
  torre_numero           int,
  responsable_usuario_id uuid,
  responsable            text,
  periodos_al_dia        int,
  periodos_totales       int,
  insignias              int
)
language sql
stable
security definer
set search_path = public
as $$
  with periodos as (
    -- Los últimos 12 periodos con cuota definida en el condominio.
    select id, periodo
    from public.cuota_administracion
    where condominio_id = p_condominio_id
    order by periodo desc
    limit 12
  ),
  responsables as (
    -- Quien responde por la unidad: el administrador primario si existe, y si
    -- no, el propietario. `distinct on` deja una sola fila por unidad.
    select distinct on (m.unidad_id)
      m.unidad_id, m.usuario_id, m.nombre
    from public.membresia_unidad m
    where m.activo
    order by m.unidad_id,
             m.es_admin_primario desc,
             (m.rol = 'propietario') desc,
             m.created_at
  )
  select
    u.id,
    u.codigo,
    t.numero,
    r.usuario_id,
    r.nombre,
    pagos.al_dia,
    (select count(*) from periodos)::int,
    (select count(*)::int
       from public.reconocimiento rec
      where rec.usuario_id = r.usuario_id
        and rec.condominio_id = p_condominio_id)
  from public.unidad u
  join public.torre t on t.id = u.torre_id
  join responsables r on r.unidad_id = u.id
  cross join lateral (
    select count(*) filter (where p.pagado)::int as al_dia
    from periodos per
    left join public.pago_cuota p
      on p.cuota_id = per.id and p.unidad_id = u.id
  ) pagos
  where u.condominio_id = p_condominio_id
    and u.deleted_at is null
    and public.es_miembro_condominio(p_condominio_id)
    -- Solo quienes no deben ningun periodo: el cuadro de honor no es una lista
    -- de morosos. Si el condominio aun no definio cuotas, ambos lados son 0 y
    -- todas las unidades entran.
    and pagos.al_dia = (select count(*) from periodos)
  order by t.numero, u.codigo;
$$;

comment on function public.cuadro_honor(uuid) is
  'Cuadro de honor: unidades sin cuotas pendientes en los últimos 12 periodos. No expone montos ni morosidad. Requiere ser miembro del condominio.';

revoke all on function public.cuadro_honor(uuid) from public;
grant execute on function public.cuadro_honor(uuid) to authenticated;


-- ----------------------------------------------------------------------------
-- Otorgar un reconocimiento
-- ----------------------------------------------------------------------------
-- `reconocimiento_escritura` solo dejaba insertar al administrador, pero la
-- pantalla ofrece el botón "Dar reconocimiento" a cualquier residente. Era un
-- error garantizado en tiempo de ejecución: el popup mostraba un toast de éxito
-- sin haber escrito nada (de hecho nunca escribía; guardaba en memoria).
--
-- Se abre la escritura a cualquier miembro del condominio, con tres límites:
--   · se firma con quien lo otorga, no se acepta un `otorgado_por` ajeno;
--   · nadie se reconoce a sí mismo;
--   · un mismo otorgante no repite la misma insignia a la misma persona dentro
--     del mes, para que la acumulación signifique algo.

alter table public.reconocimiento
  alter column otorgado_por set not null;

-- `date_trunc` sobre `timestamptz` depende de la zona horaria de la sesion y no
-- es inmutable, asi que no sirve para un indice. Anclarlo a UTC si lo es.
create unique index reconocimiento_unico_por_mes
  on public.reconocimiento (
    otorgado_por, usuario_id, insignia_id,
    (date_trunc('month', otorgado_en at time zone 'UTC'))
  );

alter table public.reconocimiento
  add constraint reconocimiento_no_autootorgado
  check (otorgado_por <> usuario_id);

drop policy if exists reconocimiento_escritura on public.reconocimiento;

create policy reconocimiento_alta on public.reconocimiento
  for insert to authenticated
  with check (
    otorgado_por = auth.uid()
    and public.es_miembro_condominio(condominio_id)
  );

create policy reconocimiento_baja on public.reconocimiento
  for delete to authenticated
  using (otorgado_por = auth.uid() or public.es_admin_condominio(condominio_id));

comment on policy reconocimiento_alta on public.reconocimiento is
  'Cualquier miembro del condominio reconoce a otro. Firma obligatoria y sin autootorgamiento.';


-- ----------------------------------------------------------------------------
-- Catálogo base de insignias
-- ----------------------------------------------------------------------------
-- El catálogo vivía como un array fijo en el componente del popup. Es un dato
-- del producto, no del cliente: va en la base para que se pueda ampliar sin
-- publicar una versión de la app.

insert into public.insignia (clave, etiqueta, icono) values
  ('buen_vecino',  'Buen vecino',  '🤝'),
  ('reciclador',   'Reciclador',   '♻️'),
  ('colaborador',  'Colaborador',  '🤲'),
  ('puntual',      'Puntual',      '⏰'),
  ('solidario',    'Solidario',    '💛')
on conflict (clave) do nothing;
