-- ============================================================================
-- 0012 · Agrega "van" a tipo_vehiculo
-- ============================================================================
-- El documento de producto habla de cuatro opciones (bus, camioneta, moto,
-- auto), pero el selector de la app ofrece CINCO: incluye "Van". Con el enum de
-- cuatro, elegir Van en el formulario habria fallado al guardar.
--
-- Se agrega el valor que la interfaz ya ofrece. Si producto decide que Van no
-- corresponde, se quita del selector, no al reves: la base no deberia rechazar
-- algo que la app deja elegir.
-- ============================================================================

alter type public.tipo_vehiculo add value if not exists 'van';
