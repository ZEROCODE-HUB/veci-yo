-- ----------------------------------------------------------------------------
-- Ficha del alojamiento en renta corta
-- ----------------------------------------------------------------------------
-- "Mi alojamiento" mostraba una ficha fija: "Departamento de 2 habitaciones,
-- 1 cama queen, 1 cama individual", 4 huespedes, 1 estacionamiento, sin
-- mascotas y apto para ninos. Era la misma para cualquier vivienda.
--
-- Tres de esos datos ya existen y no se duplican aqui:
--   · habitaciones        -> `tipologia.habitaciones`
--   · mascotas y ninos    -> `permiso_vivienda.corta_permite_mascotas` /
--                            `corta_permite_ninos`
--
-- Los que faltaban son de la vivienda concreta, no de su tipologia: dos
-- departamentos iguales pueden recibir distinto numero de huespedes segun como
-- los amueble cada propietario.

alter table public.suscripcion_renta_corta
  add column descripcion               text,
  add column max_huespedes             integer,
  add column estacionamientos_huesped  integer not null default 0;

alter table public.suscripcion_renta_corta
  add constraint suscripcion_max_huespedes_positivo
    check (max_huespedes is null or max_huespedes > 0),
  add constraint suscripcion_estacionamientos_no_negativos
    check (estacionamientos_huesped >= 0);

comment on column public.suscripcion_renta_corta.max_huespedes is
  'Cuantas personas admite esta vivienda. Depende del mobiliario, no de la tipologia.';
