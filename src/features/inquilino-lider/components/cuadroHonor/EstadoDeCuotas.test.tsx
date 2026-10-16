import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { EstadoDeCuotas } from "./EstadoDeCuotas";

/**
 * Lo que se pinta debajo del carrusel de cuotas (15/10/2026, hueco 13).
 *
 * La lista ya la recorta la base según lo que la administración elige
 * publicar; aquí se comprueba que la pantalla no añade de su parte lo que no
 * toca: sin «quién debe», no hay sección de pendientes aunque llegara alguna.
 */

const detalle = [
  { unidad_id: "u1", codigo: "101", torre: 1, responsable: "Guillermo", pagado: true },
  { unidad_id: "u2", codigo: "301", torre: 1, responsable: "Marcela", pagado: false },
];
const miCuota = { mes: "Septiembre 2026", monto: 180000, moneda: "COP", venceEn: "2026-09-10", pagado: false };

describe("el estado de las cuotas", () => {
  it("mi cuota pendiente dice cuánto y cuándo vence", () => {
    render(<EstadoDeCuotas miCuota={miCuota} detalle={[]} visibilidad="porcentaje" esAdmin={false} />);
    expect(screen.getByText("Tu cuota de Septiembre 2026")).toBeDefined();
    expect(screen.getByText("Pendiente")).toBeDefined();
    expect(screen.getByText("Vence el 10/09/2026")).toBeDefined();
  });

  it("con «solo el porcentaje», ninguna lista", () => {
    render(<EstadoDeCuotas miCuota={miCuota} detalle={detalle} visibilidad="porcentaje" esAdmin={false} />);
    expect(screen.queryByText(/^Al día/)).toBeNull();
    expect(screen.queryByText(/^Pendientes/)).toBeNull();
  });

  it("con «quién está al día», los que pagaron y nada de pendientes", () => {
    render(<EstadoDeCuotas miCuota={null} detalle={detalle} visibilidad="quien_pago" esAdmin={false} />);
    expect(screen.getByText("Al día (1)")).toBeDefined();
    expect(screen.getByText("101 Guillermo")).toBeDefined();
    expect(screen.queryByText(/^Pendientes/)).toBeNull();
  });

  it("con «quién debe», las dos listas", () => {
    render(<EstadoDeCuotas miCuota={null} detalle={detalle} visibilidad="quien_debe" esAdmin={false} />);
    expect(screen.getByText("Pendientes (1)")).toBeDefined();
    expect(screen.getByText("301 Marcela")).toBeDefined();
  });
});
