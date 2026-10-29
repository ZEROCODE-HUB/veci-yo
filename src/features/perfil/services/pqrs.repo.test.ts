import { describe, expect, it, vi } from "vitest";

// El repositorio importa el cliente de Supabase, que a su vez arrastra React
// Native. Aquí solo se prueba la traducción entre los enums de la base y las
// etiquetas de la interfaz, así que el cliente se sustituye por un doble vacío.
vi.mock("@/shared/services/supabase", () => ({ supabase: {} }));
vi.mock("@/shared/utils", () => ({ formatDate: (d: Date) => d.toISOString() }));
vi.mock("@/shared/services/archivos", () => ({
  borrarArchivo: vi.fn(),
  subirArchivo: vi.fn(),
}));

const { DESTINATARIOS, ESTADOS, MEDIOS_CONTACTO } = await import("./pqrs.repo");

/**
 * El formulario de PQRS trabaja con etiquetas ("Condominio", "Queja") y la
 * base con enums (`condominio`, `queja`). Antes de la migración del 22/09/2026
 * convivían cuatro vocabularios de "categoría" que no coincidían entre sí, y
 * el mapeo se hacía a mano en cada pantalla.
 *
 * Lo que estas pruebas protegen es que los diccionarios sigan siendo
 * biyectivos: una etiqueta repetida haría que la búsqueda inversa devolviera
 * la clave equivocada, sin error visible.
 *
 * Las áreas y los tipos ya no son diccionarios de aquí: son listas de la base
 * (28/10/2026). Qué tipos ofrece cada área lo prueba `tiposDePqrs.test.ts`.
 */

const diccionarios = {
  ESTADOS,
  DESTINATARIOS,
  MEDIOS_CONTACTO,
} as const;

describe("diccionarios de PQRS", () => {
  for (const [nombre, diccionario] of Object.entries(diccionarios)) {
    it(`${nombre}: ninguna etiqueta se repite`, () => {
      const etiquetas = Object.values(diccionario);
      expect(new Set(etiquetas).size).toBe(etiquetas.length);
    });

    it(`${nombre}: ninguna etiqueta está vacía`, () => {
      for (const etiqueta of Object.values(diccionario)) {
        expect(String(etiqueta).trim()).not.toBe("");
      }
    });
  }
});
