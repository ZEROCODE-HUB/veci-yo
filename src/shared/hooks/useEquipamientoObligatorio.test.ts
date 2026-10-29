import { describe, expect, it, vi } from "vitest";

// `useLista` importa el cliente de Supabase, que arrastra React Native. Aquí
// solo se prueba la parte pura.
vi.mock("@/shared/services/supabase", () => ({ supabase: {} }));

const { SEMILLA } = await import("@/pruebas/listasDeLaBase");
const { equipamientoDeLaLista } = await import("./useEquipamientoObligatorio");

/**
 * Del administrador salen el nombre, el icono y el orden; qué casillas hay lo
 * fijan las columnas `tiene_*` de la base (28/10/2026).
 */
const semilla = SEMILLA.equipamiento_obligatorio ?? [];

describe("equipamientoDeLaLista", () => {
  it("las tres de la semilla, con su clave, su nombre y su icono", () => {
    expect(equipamientoDeLaLista(semilla)).toEqual([
      { clave: "antirruido", etiqueta: "Dispositivo antirruido", icono: "🔇" },
      { clave: "noFumar", etiqueta: "Señalética de no fumar", icono: "🚭" },
      { clave: "sensor", etiqueta: "Sensor de incendio/gas/CO2", icono: "🔥" },
    ]);
  });

  it("respeta el orden y el nombre que ponga el administrador", () => {
    const reordenada = [{ ...semilla[2], etiqueta: "Detector de humo" }, semilla[0]];
    expect(equipamientoDeLaLista(reordenada).map((e) => [e.clave, e.etiqueta])).toEqual([
      ["sensor", "Detector de humo"],
      ["antirruido", "Dispositivo antirruido"],
    ]);
  });

  it("ignora una opción cuya clave no es una columna", () => {
    const rara = { ...semilla[0], codigo: "extintor", extra: { clave_en_codigo: "extintor" } };
    expect(equipamientoDeLaLista([rara])).toEqual([]);
  });
});
