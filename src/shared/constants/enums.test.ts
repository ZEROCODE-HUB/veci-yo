import { describe, expect, it } from "vitest";
import {
  CATEGORIA_CORRESPONDENCIA,
  ESTADO_ENCOMIENDA,
  TIPO_DOCUMENTO,
  TIPO_VEHICULO,
  claveDeEtiqueta,
  etiquetasDe,
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
  it("cubre los seis documentos que acepta la base", () => {
    // El selector ofrecía tres: quien tuviera carné de extranjería o PEP no
    // podía registrarse.
    expect(etiquetasDe(TIPO_DOCUMENTO)).toHaveLength(6);
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
