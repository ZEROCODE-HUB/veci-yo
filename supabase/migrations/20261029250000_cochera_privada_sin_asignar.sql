-- Una cochera privada puede existir sin departamento (29/10/2026).
--
-- El cliente pidió que «Cocheras privadas» en la torre cree esa cantidad de
-- cocheras con su código, para asignarlas después a un departamento (o desde
-- el departamento elegir una libre). La restricción
-- `estacionamiento_privado_con_unidad` lo impedía: crear la torre fallaba al
-- crear sus privadas (GSheet, T-351) y quitar una cochera de un departamento
-- también. Privada sigue queriendo decir «de un departamento, no de visitas»;
-- libre es la que todavía no tiene dueño. No se borra ningún dato.
alter table public.estacionamiento drop constraint if exists estacionamiento_privado_con_unidad;
comment on column public.estacionamiento.unidad_id is
  'El departamento al que está asignada. Una privada sin departamento está libre para asignar (29/10/2026).';
