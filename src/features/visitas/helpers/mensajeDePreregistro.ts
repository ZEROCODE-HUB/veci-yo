import { formatDateIso } from "@/shared/utils";

/**
 * El mensaje con el que el anfitrión le pasa el preregistro a su huésped, para
 * pegarlo en Airbnb o WhatsApp (QA 23/10/2026, responsable de producto).
 *
 * Es el **mismo** al crear la reserva y al reenviarlo desde ella: antes uno
 * salía sin enlace y el otro con el enlace solo, sin texto.
 */
export interface DatosDelMensaje {
  nombre?: string;
  vivienda?: string;
  torre?: string | number;
  condominio?: string;
  ciudad?: string;
  desde?: string;
  hasta?: string;
}

/** Viene en `yyyy-MM-dd` (el alta) o ya en `dd/MM/yyyy` (la ficha de la reserva). */
const fecha = (valor: string) =>
  /^\d{2}\/\d{2}\/\d{4}$/.test(valor) ? valor : formatDateIso(valor);

export function mensajeDePreregistro(d: DatosDelMensaje & { enlace: string }): string {
  const saludo = d.nombre?.trim() ? `Hola, ${d.nombre.trim()}.` : "Hola.";
  const donde = [
    d.vivienda ? `en el alojamiento ${d.vivienda}` : "",
    d.torre ? `torre ${d.torre}` : "",
    d.condominio ? `de ${d.condominio}` : "",
    d.ciudad ? `en ${d.ciudad}` : "",
  ]
    .filter(Boolean)
    .join(", ");
  const cuando =
    d.desde && d.hasta
      ? `del ${fecha(d.desde)} al ${fecha(d.hasta)}`
      : d.desde
        ? `desde el ${fecha(d.desde)}`
        : "";
  const reserva = ["Tu reserva", donde, cuando].filter(Boolean).join(" ");
  return (
    `${saludo} ${reserva}. ` +
    "El edificio requiere que completes un registro de seguridad en el siguiente enlace. " +
    "Es necesario que lo completes en su totalidad, idealmente 48 horas antes de tu llegada, " +
    `para agilizar tu ingreso: ${d.enlace}`
  );
}
