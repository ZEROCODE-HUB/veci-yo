-- ----------------------------------------------------------------------------
-- Las condiciones para que te aprueben una zona
-- ----------------------------------------------------------------------------
-- Pedido por el cliente el 02/10/2026: texto libre en las condiciones de
-- aprobacion de una zona.
--
-- Hoy `requiere_aprobacion` es un interruptor y nada mas. La pantalla dice
-- «las reservas quedaran en estado Pendiente y deberan ser aprobadas por el
-- administrador», y quien reserva no tiene forma de saber **que hace falta**
-- para que se la aprueben: si hay que pagar antes, si hay que avisar con dos
-- semanas, si el salon no se presta para fiestas despues de medianoche.
--
-- No sirve `reglamento`, que ya existe: ese son las normas de uso de la zona
-- --lo que hay que cumplir **dentro**-- y se le enseña a todo el mundo al
-- reservar. Esto es otra cosa: el criterio con el que alguien va a decir que
-- si o que no. Meterlo en el mismo texto obligaria a leer tres parrafos de
-- normas de piscina para encontrar que hay que mandar el comprobante.
--
-- Aditiva: una columna nullable.

alter table public.zona_comun
  add column if not exists condiciones_aprobacion text;

comment on column public.zona_comun.condiciones_aprobacion is
  'Que hace falta para que la administracion apruebe una reserva de esta zona. Solo tiene sentido con requiere_aprobacion; el reglamento es otra cosa --las normas de uso-- y se enseña siempre.';

/*
  Solo con aprobacion. Una zona que se confirma sola no tiene condiciones de
  aprobacion que cumplir, y dejarlo escrito ahi seria un texto que nadie va a
  leer nunca --la casilla decorativa de siempre, con forma de parrafo--.

  `not valid` porque las filas de hoy tienen la columna a null y cumplen.
*/
alter table public.zona_comun
  drop constraint if exists zona_condiciones_solo_con_aprobacion;

alter table public.zona_comun
  add constraint zona_condiciones_solo_con_aprobacion
  check (condiciones_aprobacion is null or requiere_aprobacion)
  not valid;
