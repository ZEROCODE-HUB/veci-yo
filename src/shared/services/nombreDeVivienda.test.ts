import { describe, expect, it } from "vitest";
import { nombreDeVivienda } from "./nombreDeVivienda";

/**
 * El texto que se lee --y se pulsa-- en la barra de arriba.
 *
 * Antes decía solo «Torre 1 · 102». Quien tiene casa en dos edificios veía dos
 * filas en el desplegable sin nada que dijera cuál era cuál, y el personal leía
 * otra cosa distinta en el mismo sitio: «Admin · Las Barranqueras 246».
 */
const BARRANQUERAS = {
  direccion: "Las Barranqueras 246",
  alias: "Torre 1 · 102",
  codigo: "102",
};

describe("cómo se nombra una vivienda arriba", () => {
  it("dice el edificio y la vivienda", () => {
    expect(nombreDeVivienda(BARRANQUERAS)).toBe("Las Barranqueras 246 · 102");
  });

  it("sin código de unidad, el edificio solo", () => {
    /*
      El modo incógnito y los datos de demostración traen dirección y mote, y
      ninguna unidad. Antes de esto salía el mote; ahora, el edificio, que es
      lo que de verdad nombra el sitio.
    */
    expect(
      nombreDeVivienda({ direccion: "Las Barranqueras 246", alias: "Casa" }),
    ).toBe("Las Barranqueras 246");
  });

  it("sin edificio se cae al mote, y después al código", () => {
    // Nunca puede quedar vacío: ese texto es el que se pulsa para cambiar de
    // vivienda, y sin nada escrito no hay nada que pulsar.
    expect(nombreDeVivienda({ direccion: "", alias: "Torre 1 · 102" })).toBe(
      "Torre 1 · 102",
    );
    expect(nombreDeVivienda({ direccion: "", codigo: "102" })).toBe("102");
    expect(nombreDeVivienda({ direccion: "" })).toBe("");
  });
});
