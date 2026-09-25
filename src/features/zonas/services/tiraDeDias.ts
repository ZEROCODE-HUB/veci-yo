/**
 * Los días que ofrece la tira de la pantalla de una zona.
 *
 * Antes había dos botones --«Hoy» y «Mañana»-- y, debajo, un rango
 * «Desde–Hasta». Tres controles para elegir **un** día, y el rango encima no
 * puede: la grilla solo pinta un día, así que al reservar desde un rango se
 * cogía su primer día en silencio. Decisión del cliente (25/09/2026): una
 * tira de un solo renglón, de hoy en adelante.
 *
 * El pasado no se ofrece. La base lo rechaza desde `20260924120000` --hay un
 * disparador-- y una pantalla que deja pulsar lo que va a fallar es peor que
 * una que no lo ofrece.
 */
export interface DiaDeLaTira {
  fecha: Date;
  /** `yyyy-MM-dd` en hora local, que es como se comparan los días aquí. */
  iso: string;
  /** «lun», «mar»… en minúsculas, para el renglón de arriba de la píldora. */
  diaSemana: string;
  diaMes: number;
  esHoy: boolean;
  esManana: boolean;
}

const DIAS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];

/** `yyyy-MM-dd` en local. En UTC, desde Colombia, a partir de las 19:00 daría mañana. */
export function enISO(fecha: Date): string {
  const mes = String(fecha.getMonth() + 1).padStart(2, "0");
  const dia = String(fecha.getDate()).padStart(2, "0");
  return `${fecha.getFullYear()}-${mes}-${dia}`;
}

function aMedianoche(fecha: Date): Date {
  const copia = new Date(fecha);
  copia.setHours(0, 0, 0, 0);
  return copia;
}

export function tiraDeDias(hoy: Date = new Date(), cuantos = 14): DiaDeLaTira[] {
  const inicio = aMedianoche(hoy);
  const manana = new Date(inicio);
  manana.setDate(manana.getDate() + 1);

  return Array.from({ length: Math.max(0, cuantos) }, (_, i) => {
    const fecha = new Date(inicio);
    fecha.setDate(fecha.getDate() + i);
    return {
      fecha,
      iso: enISO(fecha),
      diaSemana: DIAS[fecha.getDay()],
      diaMes: fecha.getDate(),
      esHoy: i === 0,
      esManana: enISO(fecha) === enISO(manana),
    };
  });
}

/**
 * Cómo se traduce un día de la tira al estado que la pantalla ya tenía.
 *
 * `dayFilter` no es decorativo: de él sale también la lista de nombres de día
 * con la que se filtran las reservas del histórico. Por eso la tira no lo
 * sustituye, lo alimenta: hoy y mañana siguen siendo «hoy» y «manana», y
 * cualquier otro día es una fecha suelta. Así el control cambia y lo que hay
 * debajo sigue funcionando igual.
 */
export function comoFiltro(
  elegido: Date,
  hoy: Date = new Date(),
): { dayFilter: "hoy" | "manana" | null; selectedDate: Date | null } {
  const dias = tiraDeDias(hoy, 2);
  const iso = enISO(elegido);
  if (iso === dias[0].iso) return { dayFilter: "hoy", selectedDate: null };
  if (iso === dias[1].iso) return { dayFilter: "manana", selectedDate: null };
  return { dayFilter: null, selectedDate: aMedianoche(elegido) };
}

const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];
const DIAS_LARGOS = [
  "domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado",
];

/**
 * El día elegido, escrito para leerlo: «Hoy, viernes 25 de septiembre».
 *
 * El formulario de reserva lo enseña en un renglón en lugar del calendario de
 * mes entero que preguntaba otra vez por una fecha ya elegida. «Hoy» y
 * «mañana» delante porque es lo que se reserva casi siempre, y un número de
 * día suelto obliga a hacer la cuenta.
 */
export function diaEnLetra(fecha: Date, hoy: Date = new Date()): string {
  const [dHoy, dManana] = tiraDeDias(hoy, 2);
  const iso = enISO(fecha);
  const largo = `${DIAS_LARGOS[fecha.getDay()]} ${fecha.getDate()} de ${MESES[fecha.getMonth()]}`;
  if (iso === dHoy.iso) return `Hoy, ${largo}`;
  if (iso === dManana.iso) return `Mañana, ${largo}`;
  return largo.charAt(0).toUpperCase() + largo.slice(1);
}
