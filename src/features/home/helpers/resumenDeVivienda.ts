import type { ResumenDeVivienda } from "@/shared/services/viviendaActiva.repo";

const cuantos = (n: number, uno: string, varios: string) =>
  `${n} ${n === 1 ? uno : varios}`;

/**
 * Lo que pasa hoy en una vivienda, en frases cortas para su tarjeta.
 *
 * Solo lo que hay: una vivienda sin paquetes no dice «0 paquetes». Devuelve
 * una lista vacía cuando no hay nada, y quien la pinta decide qué poner.
 */
export function resumenEnFrases(resumen?: ResumenDeVivienda): string[] {
  if (!resumen) return [];
  const frases: string[] = [];

  if (resumen.huespedesDentro > 0) {
    frases.push(cuantos(resumen.huespedesDentro, "huésped dentro", "huéspedes dentro"));
  }
  if (resumen.visitasHoy > 0) {
    frases.push(cuantos(resumen.visitasHoy, "visita hoy", "visitas hoy"));
  }
  if (resumen.correspondenciaPendiente > 0) {
    frases.push(
      cuantos(
        resumen.correspondenciaPendiente,
        "paquete en portería",
        "paquetes en portería",
      ),
    );
  }
  if (resumen.estanciasProximas > 0) {
    frases.push(
      cuantos(resumen.estanciasProximas, "reserva próxima", "reservas próximas"),
    );
  }
  return frases;
}
