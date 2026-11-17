import { formatMoney, formatMonthYear, parseFechaIso } from "@/shared/utils/date.util";

/**
 * A qué meses fue un pago (17/11/2026). Un pago paga primero la cuota más
 * vieja que se debe, y lo que sobra pasa a la siguiente o queda a favor: lo
 * reparte la base (`registrar_pago_de_vivienda`) y aquí solo se cuenta.
 */
export interface ReparticionDePago {
  /** El mes, en ISO. Null en la fila que dice que no se debía nada. */
  periodo: string | null;
  aplicado: number;
  /** Lo que queda a favor de ese pago; el mismo en todas las filas. */
  saldoAFavor: number;
}

const nombreDelMes = (periodo: string) => {
  const fecha = parseFechaIso(periodo);
  return fecha ? formatMonthYear(fecha) : periodo;
};

/**
 * «Pago registrado: cubrió agosto 2026 (100.000 COP) y septiembre 2026
 * (50.000 COP). Quedan 20.000 COP a favor.»
 */
export function textoDeReparticion(filas: ReparticionDePago[], moneda: string): string {
  const dinero = (monto: number) => (moneda ? formatMoney(monto, moneda) : String(monto));
  const meses = filas.filter((f) => f.periodo && f.aplicado > 0);
  const aFavor = filas[0]?.saldoAFavor ?? 0;

  const partes = meses.map((f) => `${nombreDelMes(f.periodo as string)} (${dinero(f.aplicado)})`);
  const cubrio =
    partes.length === 0
      ? "Pago registrado. No debía ningún mes"
      : partes.length === 1
        ? `Pago registrado: cubrió ${partes[0]}`
        : `Pago registrado: cubrió ${partes.slice(0, -1).join(", ")} y ${partes[partes.length - 1]}`;
  return aFavor > 0 ? `${cubrio}. Quedan ${dinero(aFavor)} a favor.` : `${cubrio}.`;
}
