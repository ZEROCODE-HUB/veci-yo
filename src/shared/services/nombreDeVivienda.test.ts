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

/**
 * El apodo que la persona le pone a su vivienda --«La playa»--, que vive en su
 * membresía y es suyo: dos que comparten casa pueden ponerle motes distintos.
 *
 * Es lo que la tarjeta prometía desde el prototipo y nunca existió: decía
 * «Alias: Torre 1 · 102» sobre un texto que compone la aplicación.
 */
describe("cuando la persona le puso nombre a su vivienda", () => {
  it("manda el apodo, y va solo", () => {
    // Sin el edificio delante: quien la llama «La playa» quiere leer «La
    // playa», no «Las Barranqueras 246 · La playa».
    expect(nombreDeVivienda({ ...BARRANQUERAS, apodo: "La playa" })).toBe(
      "La playa",
    );
  });

  it("un apodo en blanco no es un apodo", () => {
    /*
      La base no deja guardar uno vacío --lo sujeta un `check`-- pero el campo
      llega aquí desde la pantalla antes de pasar por ella. Sin esto, borrar el
      texto dejaría el nombre de arriba en blanco, y ese texto es el que se
      pulsa para cambiar de vivienda.
    */
    expect(nombreDeVivienda({ ...BARRANQUERAS, apodo: "   " })).toBe(
      "Las Barranqueras 246 · 102",
    );
    expect(nombreDeVivienda({ ...BARRANQUERAS, apodo: "" })).toBe(
      "Las Barranqueras 246 · 102",
    );
  });

  it("se le quitan los espacios de los lados", () => {
    expect(nombreDeVivienda({ ...BARRANQUERAS, apodo: " La playa " })).toBe(
      "La playa",
    );
  });
});
