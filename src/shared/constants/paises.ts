import { PAISES_DEL_MUNDO } from "./paises.generado";

/**
 * Los países, con su prefijo telefónico.
 *
 * Es la única lista, y la usan el selector de teléfono, el de país y el alta de
 * un edificio. Desde el 26/10/2026 son **todos**: los 245 países y territorios
 * con numeración propia, generados de la base pública de teléfonos de Google y
 * los nombres en español de Unicode (`scripts/generar-paises.mjs`). Antes eran
 * veintiocho escritos a mano, y un huésped de Japón no podía poner su teléfono.
 *
 * El orden no es alfabético del todo, a propósito: Colombia y Perú primero, que
 * es donde opera el producto hoy, y después el resto. En una lista de
 * doscientos, lo que importa es que lo probable esté arriba.
 */
export interface Pais {
  /** ISO 3166-1 alfa-2, que es como se guarda en la base. */
  codigo: string;
  nombre: string;
  /** Prefijo telefónico internacional, sin el `+`. */
  prefijo: string;
}

const PRIMEROS = ["CO", "PE"];

export const PAISES: Pais[] = [
  ...PRIMEROS.map((codigo) => PAISES_DEL_MUNDO.find((p) => p.codigo === codigo)!),
  ...PAISES_DEL_MUNDO.filter((p) => !PRIMEROS.includes(p.codigo)),
];

/** El país por defecto cuando nadie ha dicho nada. */
export const PAIS_POR_DEFECTO = "CO";

export function paisPorCodigo(codigo: string | null | undefined): Pais | null {
  if (!codigo) return null;
  return PAISES.find((p) => p.codigo === codigo.toUpperCase()) ?? null;
}

/**
 * El número con su prefijo, listo para marcar o para WhatsApp.
 *
 * Devuelve cadena vacía si falta alguna de las dos piezas: media cosa no sirve
 * para llamar, y un `+57` suelto parece un teléfono y no lo es.
 */
export function telefonoInternacional(
  codigoPais: string | null | undefined,
  telefono: string | null | undefined,
): string {
  const pais = paisPorCodigo(codigoPais);
  const numero = (telefono ?? "").replace(/\D/g, "");
  if (!pais || !numero) return "";
  return `+${pais.prefijo}${numero}`;
}

/**
 * Busca países por nombre, código o prefijo.
 *
 * Por prefijo también: alguien que sabe que su número empieza por 57 y no se
 * acuerda de cómo se escribe su país lo encuentra igual.
 */
export function buscarPaises(texto: string): Pais[] {
  const q = texto.trim().toLowerCase();
  if (!q) return PAISES;
  const sinAcentos = (s: string) =>
    s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  return PAISES.filter(
    (p) =>
      sinAcentos(p.nombre).includes(sinAcentos(q)) ||
      // Con 245 países, «81» no puede sacar también Serbia (+381): el código
      // entero y el prefijo por su principio (26/10/2026).
      p.codigo.toLowerCase() === q ||
      (/^\+?\d+$/.test(q) && p.prefijo.startsWith(q.replace("+", ""))),
  );
}
