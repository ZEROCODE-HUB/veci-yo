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

const MESES_LARGOS = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

/** `dd/MM/yyyy` — el formato canónico en que se almacenan las fechas. */
export const formatDate = (date: Date) =>
  `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;

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
