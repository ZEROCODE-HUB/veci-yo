import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import type { VisitaItem } from "@/shared/types";
import { AsistenciaDelPermanente } from "./AsistenciaDelPermanente";

/**
 * Lo que la vecina y la portería ven de un profesional permanente.
 *
 * La tarjeta decía «Lun – Vie» escrito a fuego y no había asistencia
 * (13/10/2026). Se mira lo que **se ve**: que los días se guarden lo comprueba
 * el recorrido `el-permanente-se-registra-cada-dia`.
 */
const visita = (extra: Partial<VisitaItem> = {}): VisitaItem =>
  ({
    id: 1,
    tipo: "permanente",
    nombre: "Rosa",
    estado: "Programada",
    diasTrabajo: [1, 3, 5],
    jornadas: [
      { id: "j2", fecha: "13/10/2026", entrada: "08:02", fueraDeDia: true },
      {
        id: "j1",
        fecha: "12/10/2026",
        entrada: "08:00",
        salida: "16:10",
        fueraDeDia: false,
      },
    ],
    ...extra,
  }) as unknown as VisitaItem;

describe("la asistencia de un profesional permanente", () => {
  it("dice los días que eligió la vivienda, no una semana inventada", () => {
    render(<AsistenciaDelPermanente item={visita()} />);
    expect(screen.getByText("Viene: Lun, Mié y Vie")).toBeTruthy();
  });

  it("sin días decididos lo dice", () => {
    render(<AsistenciaDelPermanente item={visita({ diasTrabajo: undefined })} />);
    expect(screen.getByText("Viene: Sin días asignados")).toBeTruthy();
  });

  it("enseña cada entrada, quién sigue dentro y qué día no era el suyo", () => {
    render(<AsistenciaDelPermanente item={visita()} />);
    expect(
      screen.getByText("13/10/2026 · entró 08:02 · sigue dentro · no era su día"),
    ).toBeTruthy();
    expect(
      screen.getByText("12/10/2026 · entró 08:00 · salió 16:10"),
    ).toBeTruthy();
  });

  it("la portería no puede cambiar los días", () => {
    render(<AsistenciaDelPermanente item={visita()} />);
    expect(screen.queryByText("Cambiar días")).toBeNull();
  });

  it("la vivienda sí: quita un día y se guarda lo que quedó", () => {
    const alCambiar = vi.fn();
    render(<AsistenciaDelPermanente item={visita()} onCambiarDias={alCambiar} />);

    fireEvent.click(screen.getByText("Cambiar días"));
    fireEvent.click(screen.getByLabelText("miércoles"));
    fireEvent.click(screen.getByText("Guardar días"));

    expect(alCambiar).toHaveBeenCalledWith([1, 5]);
  });
});
