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
  it("sabe leer los siete que acepta la base", () => {
    // El selector ofrecía tres: quien tuviera carné de extranjería o PEP no
    // podía registrarse. Hoy son siete, con el PPT.
    expect(etiquetasDe(TIPO_DOCUMENTO)).toHaveLength(7);
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
    expect(Object.keys(TIPO_DOCUMENTO_OFRECIDOS)).toHaveLength(6);
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
