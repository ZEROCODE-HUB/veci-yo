import { describe, expect, it } from "vitest";
import { avisaElCentro } from "./providers";

/**
 * Una escritura que falla tiene que verse siempre.
 *
 * El aviso central existe porque quedaban quince mutaciones repartidas por ocho
 * hooks que fallaban en silencio: quien pulsaba «guardar» se quedaba creyendo
 * que había guardado. Pero sesenta y cinco sí traen su propio mensaje, y esas
 * mandan: si el central hablara también, saldrían dos avisos por un solo fallo
 * y el bueno --el que dice qué pasó-- quedaría tapado por el genérico.
 *
 * Es una decisión de una línea, y por eso mismo se rompe sin que nadie lo note.
 */
describe("quién avisa de una escritura que falla", () => {
  it("el centro, cuando la mutación no trae su propio aviso", () => {
    expect(avisaElCentro({})).toBe(true);
    expect(avisaElCentro(undefined)).toBe(true);
  });

  it("la mutación, cuando trae el suyo", () => {
    expect(avisaElCentro({ onError: () => {} })).toBe(false);
  });

  it("y el centro también si `onError` no es una función", () => {
    /*
      Un `onError` que llega como `undefined` por un spread --`...opciones`
      cuando `opciones` no lo trae-- no avisa de nada. Mirar solo si la clave
      existe dejaría ese fallo mudo, que es justo lo que se quiere evitar.
    */
    expect(avisaElCentro({ onError: undefined })).toBe(true);
    expect(avisaElCentro({ onError: null as unknown as undefined })).toBe(true);
  });
});
