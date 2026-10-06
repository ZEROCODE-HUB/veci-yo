import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CampoPais } from "./CampoPais";

/**
 * Que el país se elija de una lista y que lo que salga de aquí sea el **código**.
 *
 * Era un campo de texto libre hasta el 05/10/2026, y al guardar se recortaba a
 * las dos primeras letras de lo escrito: «Estados Unidos» acababa en la base
 * como `ES`, que es España. De esa columna salen el documento que se pide en la
 * puerta, la etiqueta del identificador fiscal y los reportes al ministerio.
 *
 * Lo que comprueba esto y no comprueba el recorrido: que al pulsar **aparezca**
 * la lista y que al elegir salga el código. Es la lección del selector de
 * fecha, que respondía, cambiaba de estado y no pintaba nada.
 */

describe("el campo de país", () => {
  it("enseña el nombre del país, no su código", () => {
    render(<CampoPais label="País" value="CO" onChange={() => {}} />);
    expect(screen.getByText("Colombia")).toBeTruthy();
  });

  it("al pulsarlo se abre la lista", async () => {
    const usuario = userEvent.setup();
    render(<CampoPais label="País" value="CO" onChange={() => {}} />);

    /*
      Antes de pulsar no hay lista. Sin esta mitad, el caso de abajo pasaría
      igual con el panel montado y abierto desde el principio.
    */
    expect(screen.queryByText("Argentina")).toBeNull();

    await usuario.click(screen.getByRole("button", { name: "País: Colombia" }));

    expect(screen.getByText("Argentina")).toBeTruthy();
  });

  it("lo que entrega al elegir es el código ISO", async () => {
    const usuario = userEvent.setup();
    const elegir = vi.fn();
    render(<CampoPais label="País" value="CO" onChange={elegir} />);

    await usuario.click(screen.getByRole("button", { name: "País: Colombia" }));
    await usuario.click(screen.getByRole("radio", { name: "Estados Unidos" }));

    // `US`, no «Estados Unidos» ni `ES`: el código, que es lo que se guarda.
    expect(elegir).toHaveBeenCalledWith("US");
  });

  it("el buscador deja solo lo que coincide", async () => {
    const usuario = userEvent.setup();
    render(<CampoPais label="País" value="CO" onChange={() => {}} />);

    await usuario.click(screen.getByRole("button", { name: "País: Colombia" }));
    await usuario.type(screen.getByPlaceholderText("Busca el país"), "urug");

    expect(screen.getByText("Uruguay")).toBeTruthy();
    expect(screen.queryByText("Argentina")).toBeNull();
  });

  it("dice cuál está elegido de una forma que llega al navegador", async () => {
    /*
      Los dos atributos. React Native Web **no traduce** `accessibilityState` a
      ningún atributo del DOM, así que sin el `aria-checked` el estado vive solo
      en el color. Ya mordió seis veces en este proyecto y está documentado en
      `Checkbox.tsx`.
    */
    const usuario = userEvent.setup();
    render(<CampoPais label="País" value="PE" onChange={() => {}} />);

    await usuario.click(screen.getByRole("button", { name: "País: Perú" }));

    expect(
      screen.getByRole("radio", { name: "Perú" }).getAttribute("aria-checked"),
    ).toBe("true");
    expect(
      screen.getByRole("radio", { name: "Colombia" }).getAttribute("aria-checked"),
    ).toBe("false");
  });

  it("la bandera es un dibujo, no dos letras", async () => {
    /*
      Esto es lo que se arregló el 05/10/2026. Antes la bandera salía del
      **código del país** —los «indicadores regionales» que el sistema pinta
      como 🇨🇴— y en Windows eso no existe: Chrome pintaba «CO». Comprobado en
      pantalla, no deducido.

      Así que el caso pregunta por lo único que lo distingue: que en el DOM
      haya un `<svg>` con su dibujo dentro. Un emoji sería un nodo de texto.
    */
    const usuario = userEvent.setup();
    const { container } = render(
      <CampoPais label="País" value="CO" onChange={() => {}} />,
    );

    const enElCampo = container.querySelector("svg");
    expect(enElCampo, "el campo cerrado no pinta la bandera").toBeTruthy();
    expect(enElCampo!.innerHTML.length).toBeGreaterThan(50);

    /*
      Y una por cada país al abrir la lista, no solo en el campo. Se cuenta
      sobre el documento y no sobre `container`: el panel se monta en un portal,
      o sea **fuera** del árbol que devuelve `render`, y contarlo ahí dio 1.
    */
    await usuario.click(screen.getByRole("button", { name: "País: Colombia" }));
    expect(document.querySelectorAll("svg").length).toBeGreaterThan(20);
  });

  it("sin país elegido dice que hay que elegirlo, en vez de quedarse en blanco", () => {
    render(<CampoPais label="País" value="" onChange={() => {}} />);
    expect(screen.getByText("Elige el país")).toBeTruthy();
  });
});
