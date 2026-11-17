import { formatMoney } from "@/shared/utils/date.util";

/**
 * La puntualidad de lo recaudado en un mes, tal como la cuenta la base
 * (`puntualidad_de_cuotas`, 17/11/2026). Aquí solo se escribe para leerse:
 * ninguna cuenta de quién pagó a tiempo se hace en el teléfono.
 */
export interface PuntualidadMes {
  /** El mes, en ISO (primer día). */
  periodo: string;
  moneda: string | null;
  /** Hasta qué día se paga a tiempo, en ISO. */
  venceEn: string;
  /** Si ese día ya pasó: lo que falta entonces está en mora. */
  yaVencio: boolean;
  viviendas: number;
  enFecha: number;
  conAtraso: number;
  sinPagar: number;
  esperado: number;
  pagadoEnFecha: number;
  pagadoConAtraso: number;
  pendiente: number;
}

/** Qué parte es `parte` de `total`, de 0 a 1. Sin total, 0: no se divide por cero. */
export function fraccion(parte: number, total: number): number {
  if (!(total > 0) || !(parte > 0)) return 0;
  return Math.min(parte / total, 1);
}

/** El porcentaje redondeado, de 0 a 100. */
export function porcentajeDe(parte: number, total: number): number {
  return Math.round(fraccion(parte, total) * 100);
}

/** «180 de 240 al día (75 %)», como lo pidió el cliente. */
export function lineaDeViviendas(cantidad: number, total: number, que: string): string {
  return `${cantidad} de ${total} ${que} (${porcentajeDe(cantidad, total)} %)`;
}

/** «1.200.000 COP (75 %)»; sin moneda, solo el porcentaje. */
export function lineaDeMonto(monto: number, esperado: number, moneda: string | null): string {
  const porcentaje = `${porcentajeDe(monto, esperado)} %`;
  return moneda ? `${formatMoney(monto, moneda)} (${porcentaje})` : porcentaje;
}

export type TonoDePuntualidad = "enFecha" | "conAtraso" | "pendiente";

export interface FilaDePuntualidad {
  tono: TonoDePuntualidad;
  /** «180 de 240 al día (75 %)». */
  viviendas: string;
  /** «En fecha: 1.200.000 COP (75 %)». Null si no hay nada esperado. */
  monto: string | null;
  /** De 0 a 1, para el ancho de su trozo en la barra. */
  parte: number;
}

/**
 * Las tres filas de la tarjeta: al día, en mora y lo que falta.
 *
 * Lo que falta se llama «en mora» solo si el plazo ya pasó; antes es
 * «todavía sin pagar», que no acusa a nadie de nada.
 */
export function filasDePuntualidad(p: PuntualidadMes): FilaDePuntualidad[] {
  const conMonto = (etiqueta: string, monto: number) =>
    p.esperado > 0 ? `${etiqueta}: ${lineaDeMonto(monto, p.esperado, p.moneda)}` : null;
  return [
    {
      tono: "enFecha",
      viviendas: lineaDeViviendas(p.enFecha, p.viviendas, "al día"),
      monto: conMonto("Pagado en fecha", p.pagadoEnFecha),
      parte: fraccion(p.enFecha, p.viviendas),
    },
    {
      tono: "conAtraso",
      viviendas: lineaDeViviendas(p.conAtraso, p.viviendas, "pagaron con atraso"),
      monto: conMonto("Pagado en mora", p.pagadoConAtraso),
      parte: fraccion(p.conAtraso, p.viviendas),
    },
    {
      tono: "pendiente",
      viviendas: lineaDeViviendas(p.sinPagar, p.viviendas, p.yaVencio ? "en mora" : "todavía sin pagar"),
      monto: conMonto(p.yaVencio ? "Falta, en mora" : "Falta, aún a tiempo", p.pendiente),
      parte: fraccion(p.sinPagar, p.viviendas),
    },
  ];
}
