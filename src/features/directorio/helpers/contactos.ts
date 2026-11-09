import { PAISES } from "@/shared/constants";

/** El papel de alguien en su vivienda, como se lee en el directorio. */
export const PAPEL_EN_LA_VIVIENDA: Record<string, string> = {
  propietario: "Propietario",
  inquilino_lider: "Inquilino líder",
  residente: "Residente",
  corresidente: "Corresidente",
  coadministrador: "Coadministrador de la vivienda",
  huesped_temporal: "Huésped temporal",
};

/**
 * El estado de la vivienda dicho para quien mira el directorio (09/11/2026,
 * Correcciones fila 8: «dice "Piso 1 - aceptado" pero no se entiende qué es
 * aceptado»). Habla del propietario, que es lo que ese estado cuenta.
 */
export const ESTADO_EN_EL_DIRECTORIO: Record<string, string> = {
  disponible: "Sin propietario asignado",
  invitado: "Propietario invitado, sin aceptar todavía",
  aceptado: "Propietario confirmado",
  config_pendiente: "Propietario confirmado, configuración pendiente",
  config_completado: "Propietario confirmado y vivienda configurada",
};

/** Solo las cifras del número, sin espacios ni guiones. */
const cifras = (telefono: string) => telefono.replace(/\D/g, "");

/**
 * El número para marcar, con el prefijo de su país (`+57 3101234567`). Sin
 * país conocido se marca tal cual: mejor eso que inventarle uno.
 */
export function numeroParaMarcar(codigoPais: string | null, telefono: string): string {
  const prefijo = PAISES.find((p) => p.codigo === (codigoPais ?? "").toUpperCase())?.prefijo;
  const numero = cifras(telefono);
  return prefijo ? `+${prefijo} ${numero}` : numero;
}

/**
 * El enlace de WhatsApp (`https://wa.me/573101234567`). WhatsApp necesita el
 * número internacional entero; sin país conocido no hay enlace.
 */
export function enlaceDeWhatsApp(codigoPais: string | null, telefono: string): string | null {
  const prefijo = PAISES.find((p) => p.codigo === (codigoPais ?? "").toUpperCase())?.prefijo;
  const numero = cifras(telefono);
  if (!prefijo || numero.length === 0) return null;
  return `https://wa.me/${prefijo}${numero}`;
}
