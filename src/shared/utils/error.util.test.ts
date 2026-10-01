import { describe, expect, it } from "vitest";
import { mensajeDeError } from "./error.util";

/**
 * Lo que la persona lee cuando algo falla.
 *
 * Veinte sitios de la aplicación escribían `error instanceof Error ?
 * error.message : respaldo`, y eso tira el mensaje útil: lo que lanza el
 * cliente de Supabase no es un `Error` sino un objeto plano, así que la rama
 * del `instanceof` era falsa casi siempre.
 *
 * Salió votando dos veces la misma opción de una encuesta: la base contesta
 * «Esta encuesta admite un solo voto por persona» y en pantalla salía «No se
 * pudo guardar el anuncio».
 */
const RESPALDO = "No se pudo guardar";

describe("el motivo de un fallo", () => {
  it("el del objeto que lanza la base, que es el que explica algo", () => {
    /*
      El caso que no funcionaba. `PostgrestError` es `{ message, details, hint,
      code }`: tiene `message` y no es un `Error`.
    */
    const deLaBase = {
      message: "Esta encuesta admite un solo voto por persona",
      details: null,
      hint: null,
      code: "P0001",
    };

    expect(mensajeDeError(deLaBase, RESPALDO)).toBe(
      "Esta encuesta admite un solo voto por persona",
    );
  });

  it("y el de un Error de toda la vida", () => {
    // Los de autenticación y los que lanza la propia aplicación sí lo son, y
    // por eso unas pantallas explicaban el motivo y otras no.
    expect(mensajeDeError(new Error("Credenciales inválidas"), RESPALDO)).toBe(
      "Credenciales inválidas",
    );
  });

  it("una cadena suelta también cuenta", () => {
    expect(mensajeDeError("Se cayó la red", RESPALDO)).toBe("Se cayó la red");
  });

  it("cuando no hay nada que contar, el respaldo", () => {
    /*
      Y un mensaje vacío es no tener nada que contar: sin esto la persona veía
      un aviso rojo **en blanco**, que es peor que la frase genérica.
    */
    expect(mensajeDeError(undefined, RESPALDO)).toBe(RESPALDO);
    expect(mensajeDeError(null, RESPALDO)).toBe(RESPALDO);
    expect(mensajeDeError({}, RESPALDO)).toBe(RESPALDO);
    expect(mensajeDeError({ message: "" }, RESPALDO)).toBe(RESPALDO);
    expect(mensajeDeError({ message: "   " }, RESPALDO)).toBe(RESPALDO);
    expect(mensajeDeError({ message: 42 }, RESPALDO)).toBe(RESPALDO);
    expect(mensajeDeError("", RESPALDO)).toBe(RESPALDO);
  });
});
