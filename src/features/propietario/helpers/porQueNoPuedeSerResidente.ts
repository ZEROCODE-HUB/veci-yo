/**
 * Por qué el propietario no puede declararse residente ahora, o null si
 * puede. La base sujeta las dos reglas; la pantalla, en vez de ofrecer el
 * interruptor y responder con un error, le explica qué hacer.
 *
 *   · D-70 (29/10/2026): una vivienda que se alquila por noches, o a la que le
 *     quedan reservas, no es para vivir (`no_se_vive_donde_se_alquila`).
 *   · 17/11/2026: con un inquilino líder activo, el propietario no vuelve a
 *     ser residente hasta quitarlo
 *     (`propietario_no_reside_mientras_haya_inquilino_lider`).
 *
 * Solo frena el paso a residente: quien ya lo es puede dejar de serlo.
 */
export const MOTIVO_INQUILINO_LIDER = "Para volver a vivir aquí, primero quita al inquilino líder.";

export const MOTIVO_ALQUILER =
  "Esta vivienda se alquila por noches (o le quedan reservas): no puedes ser residente. Da de baja la renta corta y, cuando terminen las reservas, podrás declararte residente.";

export function porQueNoPuedeSerResidente(estado: {
  esResidente: boolean;
  viviendaEnAlquiler: boolean;
  anfitrionPrimario: boolean;
  rentaCortaEnMarcha: boolean;
  hayInquilinoLider: boolean;
}): string | null {
  if (estado.esResidente) return null;
  if (estado.viviendaEnAlquiler || (estado.anfitrionPrimario && estado.rentaCortaEnMarcha)) {
    return MOTIVO_ALQUILER;
  }
  if (estado.hayInquilinoLider) return MOTIVO_INQUILINO_LIDER;
  return null;
}
