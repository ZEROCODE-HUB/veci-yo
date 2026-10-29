-- Quién reserva elige el número de puesto, o se asigna solo (29/10/2026).
--
-- `cupos_simultaneos` sirve para dos cosas: en la lavandería cada número es una
-- máquina y se elige; en la piscina «10» es «caben 10 reservas a la vez» y
-- nadie elige «Piscina N°7». El cliente: que en zonas como la piscina se asigne
-- uno libre sin preguntar. Por defecto se asigna solo; se enciende en la
-- lavandería y parecidas. Solo aditiva.
alter table public.zona_comun add column if not exists elige_numero boolean not null default false;
comment on column public.zona_comun.elige_numero is
  'Si quien reserva elige el número de puesto (lavadoras, canchas). Apagado: se le asigna uno libre sin preguntar (piscina, gimnasio). Solo cuenta con más de una reserva a la vez.';
