import { describe, expect, it } from "vitest";
import { estadoDelPaso } from "./estadoDelPaso";

/**
 * Lo que la pantalla del anfitrion afirma de cada huesped.
 *
 * El 09/10/2026 el cliente creo sus primeros huespedes y pregunto: «¿por qué
 * me sale Términos y condiciones aceptados con una X? ¿y al lado dice Aprobar
 * por excepción?».
 *
 * Porque `terminos_aceptados` es `boolean not null default false` y la
 * pantalla leia ese `false` como un rechazo. Nadie se habia negado: nadie
 * habia abierto todavia su enlace.
 */

describe("el estado de un paso del preregistro", () => {
  it("sin aceptar los términos está pendiente, no rechazado", () => {
    // El caso exacto del cliente: huésped recién creado.
    expect(estadoDelPaso({ terminosAceptados: false }, "terminosAceptados")).toBe(
      "pendiente",
    );
  });

  it("y un timeline vacío, también", () => {
    expect(estadoDelPaso({}, "terminosAceptados")).toBe("pendiente");
  });

  it("aceptados, aprobado", () => {
    // El control positivo: sin él, devolver siempre «pendiente» pasaría igual.
    expect(estadoDelPaso({ terminosAceptados: true }, "terminosAceptados")).toBe(
      "aprobado",
    );
  });

  it("la verificación cuenta si la aprueba la administración a mano", () => {
    /*
      Dos caminos para el mismo hecho: el proveedor la aprueba, o la
      administración la aprueba con hallazgos a la vista. Si solo se mirara
      `verificacionPasada`, una verificación aprobada a mano saldría pendiente
      para siempre.
    */
    expect(
      estadoDelPaso(
        { verificacionPasada: false, verificacionAprobada: true },
        "verificacionPasada",
      ),
    ).toBe("aprobado");
  });

  it("y si no la aprueba nadie, sigue pendiente", () => {
    expect(
      estadoDelPaso(
        { verificacionPasada: false, verificacionAprobada: false },
        "verificacionPasada",
      ),
    ).toBe("pendiente");
  });

  it("los pasos del ministerio se leen tal cual", () => {
    expect(estadoDelPaso({ trasideEntrada: true }, "trasideEntrada")).toBe(
      "aprobado",
    );
    expect(estadoDelPaso({ trasideEntrada: false }, "trasideEntrada")).toBe(
      "pendiente",
    );
  });
});
