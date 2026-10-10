import { describe, expect, it } from "vitest";
import { visitaSchema } from "./visita.schema";

/**
 * Cuando hace falta un nombre y cuando no.
 *
 * El 09/10/2026 el cliente no podia dar de alta un huesped temporal: el
 * formulario respondia «Nombre requerido» por mucho que el nombre sea, en una
 * estancia, **lo que rellena el huesped** desde su enlace de preregistro.
 *
 * La decision estaba escrita en dos sitios y solo uno al dia: el hook se
 * saltaba su propia comprobacion para la estancia, con un comentario de cuatro
 * lineas explicando por que, y el esquema la rechazaba igual dos lineas
 * despues con un `min(1)` sin condicion.
 *
 * Los dos lados, porque un caso sin su contrario pasaria igual con el esquema
 * abierto de par en par.
 */

const visitaBase = {
  tipo: "amigos" as const,
  nombre: "Ana Pérez",
  tieneVehiculo: false,
};

describe("el nombre en el alta de una visita", () => {
  it("hace falta para una visita normal", () => {
    const sinNombre = visitaSchema.safeParse({ ...visitaBase, nombre: "" });

    expect(sinNombre.success).toBe(false);
    expect(sinNombre.error?.issues[0]?.message).toBe("Nombre requerido");
  });

  it("no hace falta para una estancia de huésped", () => {
    const estancia = visitaSchema.safeParse({
      ...visitaBase,
      tipo: "huesped-temporal",
      nombre: "",
    });

    expect(estancia.success).toBe(true);
  });

  it("tampoco cuela un nombre de solo espacios en una visita normal", () => {
    // `min(1)` lo daba por bueno: el invitado quedaba registrado con un
    // nombre en blanco y en portería no hay a quién llamar.
    const espacios = visitaSchema.safeParse({ ...visitaBase, nombre: "   " });

    expect(espacios.success).toBe(false);
    expect(espacios.error?.issues[0]?.message).toBe("Nombre requerido");
  });

  it("y si la estancia trae nombre, se queda con él", () => {
    const conNombre = visitaSchema.safeParse({
      ...visitaBase,
      tipo: "huesped-temporal",
      nombre: "Ramiro Soto",
    });

    expect(conNombre.success).toBe(true);
    expect(conNombre.data?.nombre).toBe("Ramiro Soto");
  });

  it("el profesional temporal lo sigue necesitando", () => {
    const sinNombre = visitaSchema.safeParse({
      ...visitaBase,
      tipo: "temporal",
      nombre: "",
    });

    expect(sinNombre.success).toBe(false);
  });
});
