/**
 * Formateo determinista de fechas, horas y montos.
 *
 * No usar `toLocaleDateString` / `toLocaleTimeString` / `toLocaleString` en la
 * app: en React Native el resultado depende del locale y la zona horaria del
 * dispositivo, así que el mismo dato se renderiza distinto en cada teléfono y
 * deja de coincidir con el formato en que está almacenado.
 *
 * Formato canónico de fecha en VeciYo: `dd/MM/yyyy` con ceros a la izquierda.
 */

const pad = (value: number) => String(value).padStart(2, "0");

const MESES_CORTOS = [
  "ene", "feb", "mar", "abr", "may", "jun",
  "jul", "ago", "sep", "oct", "nov", "dic",
];

/**
 * Iniciales de los dias, de domingo a sabado. Viven aqui, junto a los meses,
 * porque son el mismo vocabulario: el calendario los tenia escritos a mano y
 * en ingles ("S M T W T F S") mientras los meses ya estaban en espanol.
 */
export const DIAS_INICIALES = ["D", "L", "M", "M", "J", "V", "S"] as const;

const MESES_LARGOS = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

/** `dd/MM/yyyy` — el formato canónico en que se almacenan las fechas. */
export const formatDate = (date: Date) =>
  `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;

/**
 * `yyyy-MM-dd` → `dd/MM/yyyy`.
 *
 * Para las fechas que llegan de la base ya en ISO. Se parte la cadena en vez
 * de construir un `Date`: `new Date("2026-10-02")` se interpreta como UTC y en
 * un dispositivo al oeste de Greenwich muestra el día anterior.
 */
export const formatDateIso = (iso: string | null | undefined) => {
  if (!iso) return "";
  const [anio, mes, dia] = iso.slice(0, 10).split("-");
  return anio && mes && dia ? `${dia}/${mes}/${anio}` : "";
};

/** `yyyy-MM-dd` — para inputs de tipo fecha y ordenamiento lexicográfico. */
export const formatDateInput = (date: Date | null) =>
  date ? `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` : "";

/** `HH:mm` en 24 horas. */
export const formatTime = (date: Date) =>
  `${pad(date.getHours())}:${pad(date.getMinutes())}`;

/** `dd/MM/yyyy HH:mm`. */
export const formatDateTime = (date: Date) => `${formatDate(date)} ${formatTime(date)}`;

/** `05 jul 2026` — para mostrar, no para almacenar. */
export const formatDateShortMonth = (date: Date) =>
  `${pad(date.getDate())} ${MESES_CORTOS[date.getMonth()]} ${date.getFullYear()}`;

/** `julio 2026` — encabezados de calendario. */
export const formatMonthYear = (date: Date) =>
  `${MESES_LARGOS[date.getMonth()]} ${date.getFullYear()}`;

/** Separador de miles con punto: `1.234.567`. */
export const formatAmount = (value: number) =>
  Math.round(value).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");

/**
 * Monedas que no usan decimales. El resto se muestran con dos.
 *
 * No es una lista de gustos: el peso colombiano no tiene fracción en
 * circulación y escribir "60.000,00 COP" es ruido, mientras que "15 USD" por
 * quince dólares con cero centavos se lee como un precio distinto.
 */
const MONEDAS_SIN_DECIMALES = new Set([
  "COP",
  "CLP",
  "PYG",
  "JPY",
  "KRW",
  "ISK",
  "VND",
]);

/**
 * Dinero con su moneda: `15,00 USD`, `60.000 COP`.
 *
 * El código ISO va detrás y no se sustituye por un símbolo a propósito. La
 * pantalla de suscripción decía `$15.00`, y `$` es el peso en Colombia, el sol
 * no pero el dólar sí: en un producto que opera en Colombia y en Perú, ese
 * símbolo solo no dice cuánto te van a cobrar.
 *
 * Determinista, como manda la regla 6: nada de `toLocaleString`, que en React
 * Native da un resultado distinto en cada teléfono.
 */
export const formatMoney = (monto: number, moneda: string) => {
  const decimales = MONEDAS_SIN_DECIMALES.has(moneda.toUpperCase()) ? 0 : 2;
  const fijo = Math.abs(monto).toFixed(decimales);
  const [entera, fraccion] = fijo.split(".");
  const conMiles = entera.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const signo = monto < 0 ? "-" : "";
  const cuerpo = fraccion ? `${conMiles},${fraccion}` : conMiles;
  return `${signo}${cuerpo} ${moneda.toUpperCase()}`;
};
