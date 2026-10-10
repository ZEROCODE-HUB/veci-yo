import { describe, expect, it } from "vitest";
import { TIPO_VEHICULO } from "@/shared/constants";
import { placasConResponsable, vehiculoHaciaBase } from "./vehiculos";

/**
 * Que el tipo de vehículo llegue a la base.
 *
 * El selector enseña rótulos —«Automóvil»— y la columna es un enum con valores
 * en minúscula —`auto`—. Entre los dos hay una traducción, y **estaba escrita a
 * mano con los rótulos como claves**:
 *
 *     const VEHICULO_HACIA_BASE = { Auto: "auto", Camioneta: "camioneta", ... }
 *
 * Eso significa que cambiar un rótulo rompe el guardado **en silencio**: la
 * función devuelve `undefined`, el vehículo entra sin tipo y nadie se entera
 * hasta que la portería busca una camioneta y no la encuentra.
 *
 * Casi pasa el 02/10/2026, al cambiar «Auto» por «Automóvil» a petición del
 * cliente. Ahora la traducción se deriva del propio diccionario, y esta prueba
 * recorre **todos** los tipos: si mañana alguien añade uno al enum y se olvida
 * del rótulo, o cambia un rótulo, se pone roja aquí y no en producción.
 */
describe("el tipo de vehículo que se guarda", () => {
  it("traduce cada rótulo del selector a su valor del enum", () => {
    for (const [valor, rotulo] of Object.entries(TIPO_VEHICULO)) {
      expect(vehiculoHaciaBase(rotulo)).toBe(valor);
    }
  });

  it("«Automóvil» es `auto`, que es el que cambió", () => {
    expect(TIPO_VEHICULO.auto).toBe("Automóvil");
    expect(vehiculoHaciaBase("Automóvil")).toBe("auto");
  });

  it("un rótulo que no existe no se inventa un tipo", () => {
    /*
      Devolver `undefined` deja el vehículo sin tipo, que es un dato incompleto
      pero cierto. Devolver `auto` por defecto metería en la base camionetas
      declaradas como coches.
    */
    expect(vehiculoHaciaBase("Patinete")).toBeUndefined();
    expect(vehiculoHaciaBase("")).toBeUndefined();
    expect(vehiculoHaciaBase(undefined)).toBeUndefined();
  });

  it("y distingue mayúsculas: el rótulo es el rótulo", () => {
    // Si algún día hace falta tolerar variantes, se decide a propósito y se
    // escribe aquí. Hoy no se tolera, y conviene que esté dicho.
    expect(vehiculoHaciaBase("automóvil")).toBeUndefined();
  });
});

describe("los vehículos de una visita, en una línea", () => {
  it("cada uno dice quién responde por él", () => {
    expect(
      placasConResponsable([
        { placa: "ABC123", responsable: "Oscar Prueba" },
        { placa: "XYZ987" },
      ]),
    ).toBe("ABC123 (responde Oscar Prueba) · XYZ987");
  });

  it("sin vehículos no escribe nada", () => {
    expect(placasConResponsable([])).toBe("");
    expect(placasConResponsable(undefined)).toBe("");
  });
});
