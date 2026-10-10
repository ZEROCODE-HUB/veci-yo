import { describe, expect, it } from "vitest";
import {
  CATEGORIA_CORRESPONDENCIA,
  ESTADO_ENCOMIENDA,
  TIPO_DOCUMENTO,
  TIPO_VEHICULO,
  claveDeEtiqueta,
  etiquetasDe,
  TIPO_DOCUMENTO_OFRECIDOS,
} from "./enums";

/**
 * Que TypeScript obligue a cubrir cada valor del enum ya lo garantiza el tipo
 * `Record<EnumDeLaBase, string>`. Lo que estas pruebas cubren es lo que el
 * compilador no ve: que dos valores distintos no compartan etiqueta.
 *
 * Importa porque la traducción de vuelta —de la etiqueta que eligió la persona
 * a la clave del enum— es una búsqueda por valor. Con dos etiquetas iguales
 * devolvería siempre la primera, y el otro valor sería inalcanzable sin que
 * nada fallara.
 */

const diccionarios = {
  TIPO_DOCUMENTO,
  TIPO_VEHICULO,
  CATEGORIA_CORRESPONDENCIA,
  ESTADO_ENCOMIENDA,
} as const;

describe("diccionarios de enums", () => {
  for (const [nombre, diccionario] of Object.entries(diccionarios)) {
    it(`${nombre}: la búsqueda inversa es unívoca`, () => {
      const etiquetas = Object.values(diccionario);
      expect(new Set(etiquetas).size).toBe(etiquetas.length);
    });

    it(`${nombre}: cada clave se recupera desde su etiqueta`, () => {
      for (const [clave, etiqueta] of Object.entries(diccionario)) {
        expect(claveDeEtiqueta(diccionario as Record<string, string>, etiqueta)).toBe(
          clave,
        );
      }
    });
  }
});

describe("tipo_documento", () => {
  it("sabe leer los nueve que acepta la base", () => {
    /*
      Se comprueba **la lista, no cuántos son**: un número suelto se pone rojo
      al añadir uno y no dice cuál falta, y lo que importa aquí es que el
      diccionario no se separe del enum de la base. Si se separa, lo que se
      pinta en la pantalla no es lo que se puede guardar.

      El selector ofrecía tres: quien tuviera carné de extranjería o PEP no
      podía registrarse. Los dos últimos son del 09/10/2026, al decidir que a
      un menor también se le pide su documento: hasta entonces la lista no
      tenía ninguno que le sirviera.
    */
    expect(Object.keys(TIPO_DOCUMENTO).sort()).toEqual([
      "carne_extranjeria",
      "cedula_ciudadania",
      "cedula_extranjeria",
      "dni",
      "pasaporte",
      "pep",
      "ppt",
      "registro_civil",
      "tarjeta_identidad",
    ]);
  });

  it("`etiquetasDe` devuelve lo que se lee, no las claves", () => {
    /*
      Es lo que alimenta cada desplegable del proyecto. Se quedo sin prueba al
      cambiar el caso de arriba por la lista de claves, y es justo la funcion
      que decide si en pantalla sale «Cedula de ciudadania» o
      `cedula_ciudadania` --que ya salio crudo una vez en la porteria--.
    */
    const etiquetas = etiquetasDe(TIPO_DOCUMENTO);

    expect(etiquetas).toContain("Pasaporte");
    expect(etiquetas).toContain("Registro civil de nacimiento");
    expect(etiquetas).not.toContain("registro_civil");
    expect(etiquetas).toHaveLength(Object.keys(TIPO_DOCUMENTO).length);
  });

  it("ofrece los dos que tiene un menor en Colombia", () => {
    /*
      Registro civil hasta los siete, tarjeta de identidad de siete a
      diecisiete. Sin ellos la lista obligaba a marcar uno falso --«cédula de
      ciudadanía» para un niño-- y eso viaja tal cual al ministerio: un dato
      malo con la forma correcta, que ninguna restricción detecta.
    */
    expect(TIPO_DOCUMENTO_OFRECIDOS.registro_civil).toBeTruthy();
    expect(TIPO_DOCUMENTO_OFRECIDOS.tarjeta_identidad).toBeTruthy();
  });

  it("ofrece el PPT, que es el que llevan hoy", () => {
    /*
      Hasta el 06/10/2026 no estaba. Un migrante venezolano con su documento
      actual **no se podía registrar**: ni como residente, ni como huésped, ni
      como visita en la portería.
    */
    expect(TIPO_DOCUMENTO_OFRECIDOS.ppt).toBeTruthy();
  });

  it("y no ofrece el PEP, que dejó de identificar en marzo de 2023", () => {
    /*
      Se queda en `TIPO_DOCUMENTO` para poder leer lo ya guardado, y fuera de lo
      que se le propone a alguien: un documento que ya no vale acaba en una
      persona rechazada en la puerta y en un reporte al ministerio inválido.

      Las dos mitades del caso, porque solo mirar que falte pasaría igual si
      alguien vaciara la lista entera por accidente.
    */
    expect(TIPO_DOCUMENTO.pep).toBeTruthy();
    expect(TIPO_DOCUMENTO_OFRECIDOS.pep).toBeUndefined();
    // Todos los demás sí se ofrecen: es el control de la línea de arriba.
    expect(Object.keys(TIPO_DOCUMENTO_OFRECIDOS).sort()).toEqual(
      Object.keys(TIPO_DOCUMENTO)
        .filter((clave) => clave !== "pep")
        .sort(),
    );
  });

  it("distingue la cédula de ciudadanía de la de extranjería", () => {
    expect(TIPO_DOCUMENTO.cedula_ciudadania).not.toBe(
      TIPO_DOCUMENTO.cedula_extranjeria,
    );
  });
});

describe("claveDeEtiqueta", () => {
  it("devuelve null ante una etiqueta desconocida", () => {
    // Antes que inventar una clave: un enum inexistente lo rechaza la base con
    // un error poco claro.
    expect(claveDeEtiqueta(TIPO_VEHICULO, "Patinete")).toBeNull();
  });
});
