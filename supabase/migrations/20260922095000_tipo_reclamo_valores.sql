-- ----------------------------------------------------------------------------
-- Valores que faltaban en `tipo_reclamo`
-- ----------------------------------------------------------------------------
-- El formulario de PQRS ofrece "Queja", "Idea" y "Soporte", que el enum no
-- contemplaba: se creó a partir de los datos falsos, no del formulario.
--
-- Va en su propia migración porque un valor de enum recién agregado no se
-- puede usar dentro de la misma transacción que lo agrega, y la migración
-- siguiente ya los usa.

alter type public.tipo_reclamo add value if not exists 'queja';
alter type public.tipo_reclamo add value if not exists 'idea';
alter type public.tipo_reclamo add value if not exists 'soporte';
