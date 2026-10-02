import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { PorteriaFormModal } from "./PorteriaFormModal";
import { porteriaToForm } from "../../types";

/**
 * El tipo de acceso de una portería.
 *
 * El enum tiene dos valores desde la primera migración --peatonal y vehicular--
 * y la pantalla creaba **todas** con el primero, escrito a fuego:
 * `createPorteria({ ...form, tipo: "entrada_principal" })`. El formulario no
 * ofrecía el campo y `acceso_vehicular` no aparecía en ningún sitio de la
 * aplicación.
 *
 * Doblemente muerto: ni se podía elegir ni lo leía nadie. Un edificio con
 * garaje no podía registrar su acceso vehicular, que es donde más falta hace
 * distinguir una portería de otra.
 */
describe("el formulario de una portería", () => {
  it("ofrece elegir el tipo de acceso", () => {
    render(
      <PorteriaFormModal
        visible
        editing={null}
        initial={porteriaToForm(null)}
        onClose={() => {}}
        onSave={vi.fn()}
      />,
    );

    expect(screen.getByText("Tipo de acceso")).toBeDefined();
    // Y arranca en peatonal, que es lo que tenían todas hasta ahora: el campo
    // nuevo no cambia lo que ya existe.
    expect(screen.getByText("Entrada peatonal")).toBeDefined();
  });

  it("y una portería vehicular se abre como tal", () => {
    /*
      El control positivo. Sin él, el caso de arriba pasaría igual con el
      selector pintado y el valor ignorado, que es exactamente la familia de
      defectos que esto corrige.
    */
    render(
      <PorteriaFormModal
        visible
        editing={{ id: 1, nombre: "Barrera", tipo: "acceso_vehicular" }}
        initial={porteriaToForm({
          id: 1,
          nombre: "Barrera",
          tipo: "acceso_vehicular",
        })}
        onClose={() => {}}
        onSave={vi.fn()}
      />,
    );

    expect(screen.getByText("Acceso vehicular")).toBeDefined();
  });
});
