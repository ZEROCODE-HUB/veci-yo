import type { FranjaOcupada } from "./zonas.repo";

/**
 * Qué puesto de la zona se reserva: la lavadora N°2.
 *
 * El desplegable «Seleccione N° de Lavanderia» era obligatorio y su valor no
 * llegaba a ninguna parte --`reserva_zona` no tenía columna--, así que la N°1
 * seguía ofreciéndose después de reservarla y dos huéspedes podían
 * presentarse a la misma lavadora.
 *
 * Ofrecer solo los libres es comodidad, no seguridad: el límite de verdad es
 * el disparador `reserva_zona_respetar_numero`, porque a la API se le puede
 * llamar sin pasar por esta pantalla. Aquí se evita que el vecino elija algo
 * que la base le va a rechazar.
 */

/** «Lavanderia N°2» → 2. `null` si la etiqueta no lleva número. */
export function numeroDelPuesto(etiqueta: string | null | undefined): number | null {
  const encontrado = /(\d+)\s*$/.exec((etiqueta ?? "").trim());
  if (!encontrado) return null;
  const numero = Number.parseInt(encontrado[1], 10);
  return Number.isFinite(numero) && numero > 0 ? numero : null;
}

function aMinutos(hhmm: string): number {
  return Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));
}

/** Si dos tramos `HH:mm` se pisan. Tocarse por un extremo no es pisarse. */
export function seSolapan(
  a: { desde: string; hasta: string },
  b: { desde: string; hasta: string },
): boolean {
  return aMinutos(a.desde) < aMinutos(b.hasta) && aMinutos(b.desde) < aMinutos(a.hasta);
}

/**
 * Los números que ya están cogidos en esa fecha y ese tramo.
 *
 * `fecha` va en ISO --`yyyy-MM-dd`--, que es como la devuelve la base.
 */
export function puestosOcupados(
  ocupacion: readonly FranjaOcupada[],
  fecha: string,
  tramo: { desde: string; hasta: string },
): number[] {
  const numeros = ocupacion
    .filter((franja) => franja.fecha === fecha)
    .filter((franja) => seSolapan(franja, tramo))
    // Una reserva sin número --de antes de que se guardara-- no bloquea
    // ninguno en concreto. Lo que impide que entren de más es el disparador
    // de `cupos_simultaneos`, que cuenta reservas y no mira números.
    .map((franja) => franja.numero)
    .filter((numero): numero is number => typeof numero === "number");

  return [...new Set(numeros)].sort((a, b) => a - b);
}

/** Las etiquetas del desplegable, sin las que ya no se pueden elegir. */
export function puestosDisponibles(params: {
  nombreZona: string;
  puestos: number;
  ocupados: readonly number[];
}): string[] {
  const tomados = new Set(params.ocupados);
  return Array.from({ length: Math.max(0, params.puestos) }, (_, i) => i + 1)
    .filter((numero) => !tomados.has(numero))
    .map((numero) => `${params.nombreZona} N°${numero}`);
}

/**
 * Si una reserva ocupa su franja.
 *
 * Es el espejo de lo que hace la base: `ocupacion_zona()` y los dos
 * disparadores de la tabla descartan `rechazada` y `cancelada`. La grilla no
 * descartaba nada y pintaba **todas** las reservas de la franja, canceladas
 * incluidas, al lado de un contador que sí las descartaba. En la franja de
 * las 06:00 salían tres tarjetas sobre «quedan 2 de 4»: tres más dos, cinco
 * lavadoras en una lavandería de cuatro.
 *
 * Las etiquetas son las de `ESTADO_DESDE_BASE`. Que digan lo mismo que el
 * enum de la base no es evidente --son dos vocabularios-- y por eso hay una
 * prueba que los recorre.
 */
export const ESTADOS_QUE_NO_OCUPAN = ["Cancelado", "Rechazado"] as const;

export function ocupaLaFranja(estado: string | null | undefined): boolean {
  return !ESTADOS_QUE_NO_OCUPAN.includes(
    (estado ?? "") as (typeof ESTADOS_QUE_NO_OCUPAN)[number],
  );
}
