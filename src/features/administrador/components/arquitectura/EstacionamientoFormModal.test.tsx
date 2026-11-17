import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EstacionamientoFormModal } from "./EstacionamientoFormModal";
import { estacionamientoToForm } from "../../types";

/**
 * «Ubicación obligatoria al crear Estacionamiento» (cliente, 16/11/2026).
 *
 * La ubicación era un texto libre opcional y cada estacionamiento decía lo que
 * quisiera. Ahora el nivel es obligatorio: sin él, el formulario no guarda y
 * **dice por qué** --un botón que no hace nada sin decirlo es el defecto que
 * este proyecto más ha repetido--.
 */
const NIVELES = [
  { uuid: "n-s1", nombre: "Sótano 1", nomenclatura: "S1" },
  { uuid: "n-p1", nombre: "Primer piso", nomenclatura: "P1" },
];

function montar(onSave = vi.fn()) {
  render(
    <EstacionamientoFormModal
      visible
      editing={null}
      initial={estacionamientoToForm(null)}
      units={[]}
      niveles={NIVELES}
      codigosExistentes={["S1-01", "S1-02", "S1-V01"]}
      onClose={() => {}}
      onSave={onSave}
    />,
  );
  return onSave;
}

describe("el formulario de un estacionamiento", () => {
  it("sin nivel no guarda, y dice que falta", async () => {
    const onSave = montar();
    await userEvent.type(screen.getByPlaceholderText("Ej. S1-01"), "S1-09");
    await userEvent.click(screen.getByText("Guardar"));

    expect(await screen.findByText("Elige el nivel")).toBeDefined();
    expect(onSave).not.toHaveBeenCalled();
  });

  it("con nivel sugiere el siguiente código de ese nivel y guarda", async () => {
    /*
      El control positivo: sin él, el caso de arriba pasaría igual con un
      formulario que no guardara nunca.
    */
    const onSave = montar();
    await userEvent.click(screen.getByLabelText("Nivel *: Elegir el nivel…"));
    await userEvent.click(await screen.findByText("Sótano 1 (S1)"));

    // De visita es lo primero que ofrece: sigue a S1-V01.
    expect((screen.getByPlaceholderText("Ej. S1-01") as HTMLInputElement).value).toBe("S1-V02");
    await userEvent.click(screen.getByText("Guardar"));

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave.mock.calls[0][0]).toMatchObject({ nivelId: "n-s1", codigo: "S1-V02" });
  });
});
