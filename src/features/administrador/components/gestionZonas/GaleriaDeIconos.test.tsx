import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { GaleriaDeIconos } from "./GaleriaDeIconos";

/**
 * La galería de iconos de una zona común.
 *
 * Pedida por el cliente el 02/10/2026. Hasta entonces el icono salía del
 * **tipo** de la zona: dos zonas del mismo tipo se veían idénticas --«BBQ
 * terraza» y «BBQ jardín», el mismo dibujo-- y una de un tipo que no estuviera
 * en la lista se quedaba sin ninguno. Los ocho dibujos llevaban en `assets`
 * desde el principio y no había forma de escogerlos.
 *
 * Se comprueba aquí y no recorriendo la pantalla porque lo que importa es lo
 * que se **ve y se pulsa**, y porque la sesión del navegador se cae cada vez
 * que corre la suite de recorridos —está documentado en AGENTS.md—.
 */

/*
  Los `require` de imágenes no existen en jsdom. Y el valor tiene que ser una
  **fuente válida** --`{ uri }`-- y no un número: react-native-web trata los
  números como ids del empaquetador y revienta con «asset with ID "1" could
  not be found».
*/
vi.mock("@/assets/icons/zonas", () => ({
  default: Object.fromEntries(
    [
      "piscina",
      "parque",
      "bbq",
      "gym",
      "coworking",
      "tenis",
      "sala-juegos",
      "lavanderia",
    ].map((clave) => [clave, { uri: `${clave}.png` }]),
  ),
}));

describe("la galería de iconos", () => {
  it("ofrece los ocho que hay", () => {
    render(<GaleriaDeIconos value="" onChange={() => {}} />);
    expect(screen.getAllByRole("radio").length).toBe(8);
  });

  it("dice cuál está puesto, y lo dice en el DOM", () => {
    render(<GaleriaDeIconos value="coworking" onChange={() => {}} />);

    /*
      `aria-checked`, no solo el color. React Native Web **no traduce**
      `accessibilityState`, así que sin el atributo el estado existiría nada
      más en el borde y quien use un lector de pantalla no vería ninguno
      marcado. Es la cuarta vez que este error aparece en el proyecto.
    */
    const elegido = screen.getByRole("radio", { name: /Coworking/ });
    expect(elegido.getAttribute("aria-checked")).toBe("true");

    const otro = screen.getByRole("radio", { name: /Piscina/ });
    expect(otro.getAttribute("aria-checked")).toBe("false");
  });

  it("al pulsar uno, lo elige", async () => {
    const elegir = vi.fn();
    render(<GaleriaDeIconos value="" onChange={elegir} />);

    await userEvent.click(screen.getByRole("radio", { name: /Gimnasio/ }));
    expect(elegir).toHaveBeenCalledWith("gym");
  });

  it("y al volver a pulsarlo, lo quita", async () => {
    /*
      Vacío significa «el que corresponda al tipo», que es lo que hacía antes.
      Sin esta salida, elegir un icono sería irreversible: habría que saber
      cuál era el del tipo para volver a ponerlo, y eso no se ve en ninguna
      parte.
    */
    const elegir = vi.fn();
    render(<GaleriaDeIconos value="gym" onChange={elegir} />);

    await userEvent.click(screen.getByRole("radio", { name: /Gimnasio/ }));
    expect(elegir).toHaveBeenCalledWith("");
  });
});
