import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { EtiquetaVivienda } from "./EtiquetaVivienda";

/**
 * La etiqueta del depto, la que va junto al nombre.
 *
 * Pedida por el cliente el 02/10/2026. Lo que importa comprobar es el caso
 * vacío: la administración y la portería no viven en el edificio y son las que
 * más escriben en el chat, así que una etiqueta vacía --o un «sin depto»--
 * saldría en casi todos los mensajes.
 */
describe("la etiqueta de la vivienda", () => {
  it("pinta el depto", () => {
    render(<EtiquetaVivienda codigo="301" />);
    expect(screen.getByText("301")).toBeTruthy();
  });

  it("y lo dice entero para quien no la ve", () => {
    // «301» a secas no dice de qué es ese número.
    render(<EtiquetaVivienda codigo="301" />);
    expect(screen.getByLabelText("Departamento 301")).toBeTruthy();
  });

  it("y sin depto no pinta nada", () => {
    const { container } = render(<EtiquetaVivienda codigo={null} />);
    expect(container.textContent).toBe("");
  });

  it("ni con un depto en blanco", () => {
    // `autor_unidad` es texto: un espacio es tan vacío como un null.
    const { container } = render(<EtiquetaVivienda codigo="   " />);
    expect(container.textContent).toBe("");
  });
});
