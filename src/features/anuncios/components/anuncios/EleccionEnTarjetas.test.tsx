import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EleccionEnTarjetas } from "./EleccionEnTarjetas";

/**
 * Una opción deshabilitada (18/11/2026): «Según el índice de votación» cuando
 * el edificio no suma 100 %. Se ve, dice por qué, y no se deja elegir.
 */
describe("elegir entre tarjetas", () => {
  it("una opción deshabilitada se ve, dice por qué y no se elige", async () => {
    const onCambiar = vi.fn();
    // Sin comprobar `pointer-events`: deshabilitada lo pone a none, y lo que
    // importa aquí es que, aun pulsándola, no cambia nada.
    const usuario = userEvent.setup({ pointerEventsCheck: 0 });
    render(
      <EleccionEnTarjetas
        valor="igual"
        onCambiar={onCambiar}
        opciones={[
          { valor: "igual", titulo: "Un voto igual por vivienda", detalle: "Todos valen lo mismo." },
          { valor: "indice", titulo: "Según el índice de votación", detalle: "Todavía no se puede.", deshabilitada: true },
        ]}
      />,
    );
    const porIndice = screen.getByRole("radio", { name: "Según el índice de votación" });
    expect(porIndice.getAttribute("aria-disabled")).toBe("true");
    screen.getByText("Todavía no se puede.");
    await usuario.click(porIndice);
    expect(onCambiar).not.toHaveBeenCalled();

    // Control positivo: la otra sí.
    const igual = screen.getByRole("radio", { name: "Un voto igual por vivienda" });
    expect(igual.getAttribute("aria-disabled")).not.toBe("true");
    await usuario.click(igual);
    expect(onCambiar).toHaveBeenCalledWith("igual");
  });
});
