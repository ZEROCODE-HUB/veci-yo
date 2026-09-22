-- ----------------------------------------------------------------------------
-- Dónde se usa el alias
-- ----------------------------------------------------------------------------
-- `perfil.alias` ya existía, pero no dónde quiere usarlo la persona. La
-- pantalla ofrece dos interruptores —Cuadro de Honor y Zonas Comunes— que
-- vivían en un store en memoria: se perdían al cerrar la app y no llegaban a
-- ninguna consulta, así que el alias no ocultaba nada en realidad.
--
-- Son dos banderas y no una sola porque la pantalla las ofrece por separado:
-- hay quien quiere figurar con alias en el cuadro de honor, que es público
-- para todo el edificio, y con su nombre en una reserva, que solo ve la
-- administración.

alter table public.perfil
  add column usa_alias_cuadro_honor boolean not null default false,
  add column usa_alias_zonas        boolean not null default false;

comment on column public.perfil.usa_alias_cuadro_honor is
  'La administración y la portería siempre ven el nombre real, sin importar estas banderas.';
