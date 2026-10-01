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

const { AREAS, DESTINATARIOS, ESTADOS, MEDIOS_CONTACTO, TIPOS, TIPOS_POR_AREA } =
  await import("./pqrs.repo");

/**
 * El formulario de PQRS trabaja con etiquetas ("Condominio", "Queja") y la
 * base con enums (`condominio`, `queja`). Antes de la migración del 22/09/2026
 * convivían cuatro vocabularios de "categoría" que no coincidían entre sí, y
 * el mapeo se hacía a mano en cada pantalla.
 *
 * Lo que estas pruebas protegen es que los diccionarios sigan siendo
 * biyectivos: una etiqueta repetida haría que la búsqueda inversa devolviera
 * la clave equivocada, sin error visible.
 */

const diccionarios = {
  AREAS,
  TIPOS,
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

describe("TIPOS_POR_AREA", () => {
  it("cubre todas las áreas", () => {
    expect(Object.keys(TIPOS_POR_AREA).sort()).toEqual(Object.keys(AREAS).sort());
  });

  it("solo ofrece tipos que existen en el diccionario", () => {
    for (const tipos of Object.values(TIPOS_POR_AREA)) {
      for (const tipo of tipos) {
        expect(TIPOS).toHaveProperty(tipo);
      }
    }
  });

  it("el área de la aplicación es la única con 'soporte'", () => {
    // El modelo de dispositivo solo se acepta ahí, y la restricción
    // `reclamo_modelo_solo_para_app` lo impone en la base.
    const conSoporte = Object.entries(TIPOS_POR_AREA)
      .filter(([, tipos]) => (tipos as readonly string[]).includes("soporte"))
      .map(([area]) => area);
    expect(conSoporte).toEqual(["aplicacion"]);
  });

  it("las áreas sin tipos propios no ofrecen ninguno", () => {
    // "Constructora TyC" y "Documentos antiguos" no piden subcategoría: el
    // formulario oculta el selector cuando la lista está vacía.
    expect(TIPOS_POR_AREA.constructora).toEqual([]);
    expect(TIPOS_POR_AREA.documentos_antiguos).toEqual([]);
  });
});
