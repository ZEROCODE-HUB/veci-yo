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

/**
 * Un turno, escrito para leerse.
 *
 * Existe porque **no existía**: cada sitio lo componía a mano y con distinto
 * separador. `seguridad.repo` guardaba «08:00 - 16:00» y `arquitectura.repo`
 * «08:00 a 16:00», para el mismo turno de la misma tabla, y los dos sitios que
 * lo volvían a partir esperaban « a ». Así que el borde verde de «está en
 * turno» no se encendía nunca en la lista de la administración, y sí en el
 * perfil del guardia: el mismo código, alimentado por el otro mapeo.
 *
 * Ahora el dato son dos horas —que es lo que hay en la base— y el texto se
 * compone solo aquí, al pintarlo.
 */
export const formatRangoHoras = (inicio: string, fin: string) => {
  if (!inicio && !fin) return "";
  if (!fin) return inicio;
  return `${inicio} - ${fin}`;
};

/** Minutos desde medianoche de un `HH:MM`. `null` si no es una hora. */
export const minutosDeHora = (hora: string): number | null => {
  const coincide = /^(\d{1,2}):(\d{2})/.exec(hora ?? "");
  if (!coincide) return null;
  const horas = Number(coincide[1]);
  const minutos = Number(coincide[2]);
  // 24:00 es el fin de la franja de noche --y hora valida en Postgres--.
  if (horas > 24 || minutos > 59) return null;
  if (horas === 24 && minutos !== 0) return null;
  return horas * 60 + minutos;
};

/**
 * El inverso de [formatTime]: un `HH:mm` convertido en `Date` de hoy.
 *
 * Lo necesita el selector de hora nativo, que trabaja con fechas y no con
 * texto. Estaba escrito a mano --`parseTime`-- **dos veces**, en las dos
 * pantallas de detalle de la portería, con el mismo cuerpo copiado.
 *
 * La fecha es la de hoy a propósito: solo se mira la hora, y el selector
 * necesita un día cualquiera para posicionarse.
 */
export const horaComoFecha = (valor?: string): Date => {
  const [horas = "0", minutos = "0"] = (valor || "00:00").split(":");
  const fecha = new Date();
  fecha.setHours(Number(horas), Number(minutos), 0, 0);
  return fecha;
};

/**
 * `yyyy-MM-dd` → `Date`, construido por partes.
 *
 * `new Date("2026-11-10")` se interpreta como **UTC**, así que en un
 * dispositivo al oeste de Greenwich cae en el día anterior. La construcción por
 * partes la hacía ya `CampoFecha` en línea; vive aquí desde que hizo falta en
 * un segundo sitio, para que no haya dos formas de leer la misma cadena.
 */
export const parseFechaIso = (iso: string | null | undefined): Date | null => {
  if (!iso) return null;
  const [anio, mes, dia] = iso.slice(0, 10).split("-").map(Number);
  return anio && mes && dia ? new Date(anio, mes - 1, dia) : null;
};
