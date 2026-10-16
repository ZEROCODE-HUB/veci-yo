-- ----------------------------------------------------------------------------
-- Dónde aparcan las visitas (16/10/2026, Parametrización)
-- ----------------------------------------------------------------------------
-- La ficha de una torre pide «Ubicación estacionamientos de visita» --«Sótano
-- -2»-- y no había columna: se escribía y se perdía al guardar.

alter table public.torre
  add column if not exists ubicacion_cocheras_visitas text;

comment on column public.torre.ubicacion_cocheras_visitas is
  'Dónde están los estacionamientos de visita de la torre, en texto libre (p. ej. «Sótano -2»).';
