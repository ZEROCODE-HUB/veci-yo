import { describe, expect, it } from "vitest";
import { SEMILLA } from "@/pruebas/listasDeLaBase";
import { horasDeLaOpcion, opcionDelHorario } from "./horarioDeEntrada";

/**
 * Lo que se guarda tiene que volver igual al formulario. «24 horas» se
 * guardaba como 00:00–23:59 y al reabrir se leía «00:00 a 23:59», que no es
 * ninguna opción del desplegable: salía vacío (17/10/2026).
 *
 * Desde el 28/10/2026 las horas salen del `extra` de cada opción de
 * `horarios_de_entrada`, no de partir su nombre.
 */
const opciones = SEMILLA.horarios_de_entrada ?? [];

describe("el horario de entrada, de ida y vuelta", () => {
  it.each(opciones.map((o) => [o.codigo, o] as const))("%s", (_codigo, opcion) => {
    const horas = horasDeLaOpcion(opcion);
    expect(horas).not.toBeNull();
    // La base devuelve las horas con segundos.
    expect(opcionDelHorario(opciones, `${horas!.desde}:00`, `${horas!.hasta}:00`)).toBe(opcion);
  });

  it("«24 horas» es el día entero", () => {
    expect(horasDeLaOpcion(opciones.find((o) => o.codigo === "24_horas"))).toEqual({
      desde: "00:00",
      hasta: "23:59",
    });
  });

  it("renombrar una opción no cambia sus horas", () => {
    const renombrada = { ...opciones[1], etiqueta: "Por la tarde" };
    expect(horasDeLaOpcion(renombrada)).toEqual({ desde: "14:00", hasta: "20:00" });
  });

  it("sin horario, o uno que no es de la lista, no coincide con ninguna", () => {
    expect(opcionDelHorario(opciones, null, null)).toBeUndefined();
    expect(opcionDelHorario(opciones, "09:00:00", "12:00:00")).toBeUndefined();
  });

  it("una opción sin horas bien escritas no se usa", () => {
    expect(horasDeLaOpcion({ ...opciones[0], extra: { desde: "8:30", hasta: "13:30" } })).toBeNull();
    expect(horasDeLaOpcion(undefined)).toBeNull();
  });
});
