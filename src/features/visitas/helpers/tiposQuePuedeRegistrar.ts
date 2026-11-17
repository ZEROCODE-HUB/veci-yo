import { TIPOS_VISITA } from "../constants";

/**
 * Qué tipos de visita puede registrar quien está en la pantalla de alta.
 *
 * Sale de `useVisitasNuevo` para poder probarlo sin montar el hook entero
 * (16/11/2026). La base pone los mismos límites (`visita_alta`); esto es para
 * que la pantalla no ofrezca lo que la base va a negar.
 */
export function tiposQuePuedeRegistrar({
  esGuardia,
  esAdmin,
  esHuesped,
  rentaCortaPermitida,
}: {
  esGuardia: boolean;
  esAdmin: boolean;
  esHuesped: boolean;
  rentaCortaPermitida: boolean;
}): (typeof TIPOS_VISITA)[number][] {
  return TIPOS_VISITA.filter((t) => {
    /*
      La portería registra solo amigos o familia y profesionales temporales
      (16/11/2026, pedido del cliente). Se le había quitado el alta entera el
      01/11/2026 (Para Claude 200).
    */
    if (esGuardia) return t === "amigos" || t === "temporal";
    // Sin renta corta en el edificio, no se ofrece el huésped (13/11/2026).
    if (t === "huesped-temporal" && !rentaCortaPermitida) return false;
    if (esHuesped) return t === "amigos" || t === "temporal";
    // La administración registra solo personal permanente y profesionales
    // temporales, en Inicio y en Viviendas › Visitas (Para Claude 199, 30/10/2026).
    if (esAdmin) return t === "permanente" || t === "temporal";
    return true;
  });
}
