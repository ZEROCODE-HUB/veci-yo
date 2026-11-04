/**
 * La hora del edificio, aunque el celular tenga el reloj o la zona mal
 * (04/11/2026, a raíz de Para Claude 214 y 217).
 *
 * Un tester tenía el teléfono con la zona horaria una hora corrida y la hora
 * de pared puesta a mano: la app enseñaba 13:30 una prórroga de las 12:30, y
 * a las 15:55 decía que quedaban 36 minutos de una que acababa a las 15:30.
 *
 * La app trabaja con fechas «a la hora del edificio»: sus `getHours()`,
 * `getDate()` y `getDay()` dicen la hora y el día del edificio. Para eso hay
 * dos desfases, que se miden contra la base (`reloj_del_edificio`):
 *
 *   · `desfaseDelReloj`: cuánto se adelanta el servidor al reloj del teléfono.
 *   · `desfaseDeZona`: cuánto se adelanta la hora de pared del edificio a la
 *     del teléfono, en el mismo instante.
 *
 * Con un celular bien puesto los dos son 0 y todo funciona como siempre: el
 * reloj se corrige solo si se desvía más de un minuto, y la zona solo si
 * difiere en un cuarto de hora o más (no hay zonas más finas). Así una pequeña
 * deriva no mueve nada.
 *
 * Tres funciones, según qué fecha se tiene entre manos:
 *
 *   · `ahora()`: el momento actual, a la hora del edificio. Sustituye a
 *     `new Date()` y a `Date.now()`.
 *   · `desdeLaBase(iso)`: un instante que viene de la base (`timestamptz`), a
 *     la hora del edificio. Sustituye a `new Date(fila.creado_en)`. Una fecha
 *     sin hora (`yyyy-MM-dd`) no es un instante y no pasa por aquí.
 *   · `haciaLaBase(fecha)`: el instante real de una fecha a la hora del
 *     edificio, en ISO, para escribirlo. Sustituye a `fecha.toISOString()`.
 */

const UN_MINUTO = 60_000;
const CUARTO_DE_HORA = 15 * UN_MINUTO;

let desfaseDelReloj = 0;
let desfaseDeZona = 0;

/** La hora de pared `yyyy-MM-ddTHH:mm:ss` leída como si fuera del teléfono. */
function comoHoraDelTelefono(texto: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})$/.exec(texto);
  if (!m) return null;
  const [, a, mes, d, h, mi, s] = m.map(Number);
  return new Date(a, mes - 1, d, h, mi, s).getTime();
}

/**
 * Fija los desfases a partir de lo que respondió la base. `telefonoMs` es el
 * reloj del teléfono en el momento de la respuesta.
 */
export function fijarRelojDelEdificio(
  respuesta: { ahoraMs: number; ahoraLocal: string | null },
  telefonoMs: number = Date.now(),
) {
  const reloj = respuesta.ahoraMs - telefonoMs;
  desfaseDelReloj = Math.abs(reloj) > UN_MINUTO ? reloj : 0;

  const pared = respuesta.ahoraLocal ? comoHoraDelTelefono(respuesta.ahoraLocal) : null;
  if (pared === null) {
    desfaseDeZona = 0;
    return;
  }
  // La hora de pared se manda sin milisegundos: se redondea al cuarto de hora.
  const zona = Math.round((pared - respuesta.ahoraMs) / CUARTO_DE_HORA) * CUARTO_DE_HORA;
  desfaseDeZona = zona || 0; // sin «-0»
}

/** Para las pruebas, y al cerrar sesión: vuelve al reloj del teléfono. */
export function olvidarRelojDelEdificio() {
  desfaseDelReloj = 0;
  desfaseDeZona = 0;
}

/** Los desfases en vigor, en milisegundos. */
export function desfasesDelReloj() {
  return { reloj: desfaseDelReloj, zona: desfaseDeZona };
}

/** El momento actual, a la hora del edificio. */
export function ahora(): Date {
  return new Date(Date.now() + desfaseDelReloj + desfaseDeZona);
}

/** Lo mismo en milisegundos, para medir tiempos contra `ahora()`. */
export function ahoraMs(): number {
  return Date.now() + desfaseDelReloj + desfaseDeZona;
}

/** Un instante de la base (`timestamptz` en ISO), a la hora del edificio. */
export function desdeLaBase(iso: string): Date {
  return new Date(new Date(iso).getTime() + desfaseDeZona);
}

/** Como `desdeLaBase`, pero deja pasar el vacío. */
export function desdeLaBaseSiHay(iso: string | null | undefined): Date | null {
  return iso ? desdeLaBase(iso) : null;
}

/** El instante real de una fecha a la hora del edificio, en ISO, para guardarlo. */
export function haciaLaBase(fecha: Date): string {
  return new Date(fecha.getTime() - desfaseDeZona).toISOString();
}
