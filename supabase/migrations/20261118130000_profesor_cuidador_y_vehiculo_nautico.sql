-- ============================================================================
-- Profesor, Cuidador y Vehículo náutico (18/11/2026, pedido del cliente)
-- ============================================================================
-- Listas que la administración edita en Panel › Más › Listas:
--   · oficios_de_profesionales: se añade «Profesor» (permanente y temporal),
--     antes de «Otros»; «Cuidado de menores» pasa a llamarse «Cuidador».
--     Cambia la etiqueta, no el código: las visitas guardadas no se tocan.
--   · tipos_de_vehiculo: «Vehículo náutico». El código tiene que existir en
--     el enum `tipo_vehiculo`, porque las funciones lo convierten con
--     `::tipo_vehiculo` al guardar.
-- Solo donde nadie lo cambió a mano: un nombre o un orden editado se respeta.

alter type public.tipo_vehiculo add value if not exists 'nautico';

-- «Otros» queda al final.
update public.catalogo_opcion set orden = 8
where catalogo = 'oficios_de_profesionales' and codigo = 'permanente_otros' and orden = 7;
update public.catalogo_opcion set orden = 12
where catalogo = 'oficios_de_profesionales' and codigo = 'temporal_otros' and orden = 11;

insert into public.catalogo_opcion (catalogo, codigo, etiqueta, orden, activo, extra)
select v.catalogo::public.nombre_catalogo, v.codigo, v.etiqueta, v.orden, true, v.extra::jsonb
from (values
  ('oficios_de_profesionales', 'permanente_profesor', 'Profesor', 7, '{"tipo": "permanente"}'),
  ('oficios_de_profesionales', 'temporal_profesor', 'Profesor', 11, '{"tipo": "temporal"}'),
  ('tipos_de_vehiculo', 'nautico', 'Vehículo náutico', 6, '{}')
) as v(catalogo, codigo, etiqueta, orden, extra)
where not exists (
  select 1 from public.catalogo_opcion c
  where c.catalogo = v.catalogo::public.nombre_catalogo and c.codigo = v.codigo
);

update public.catalogo_opcion set etiqueta = 'Cuidador'
where catalogo = 'oficios_de_profesionales'
  and codigo in ('permanente_cuidado_de_menores', 'temporal_cuidado_de_menores')
  and etiqueta = 'Cuidado de menores';
