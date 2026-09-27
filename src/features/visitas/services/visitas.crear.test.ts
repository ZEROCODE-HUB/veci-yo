import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * La coherencia entre la visita y sus invitados al registrarla.
 *
 * Cuando la portería registra a alguien que está entrando por la puerta, la
 * visita se crea con estado `ingresada` —eso ya estaba— pero los invitados se
 * creaban **sin `llego`**. La app se contradecía a sí misma: la tarjeta decía
 * "Ingresado" y `llego`, que se deriva de los invitados, decía que no había
 * llegado nadie.
 *
 * Y tenía una consecuencia que no se veía: el reporte TRA de entrada exige la
 * llegada confirmada, así que era **imposible** para un huésped al que la
 * portería registra al llegar, que es justamente el caso normal.
 */

/**
 * Lo que se le mandó a cada tabla.
 *
 * Las filas se leen campo a campo en las comprobaciones, así que se declara la
 * forma en vez de dejarlo en `any`: si mañana el repositorio deja de mandar
 * `llego`, la prueba falla al compilar en lugar de comparar `undefined` con
 * `false` y pasar.
 */
type FilaInsertada = Record<string, unknown>;
let insertado: Record<string, FilaInsertada[] | FilaInsertada> = {};

/** Las filas de una tabla, que en este doble siempre llegan como lista. */
function filasDe(tabla: string): FilaInsertada[] {
  const filas = insertado[tabla];
  return Array.isArray(filas) ? filas : [filas];
}

/** La única fila de una tabla. */
function filaDe(tabla: string): FilaInsertada {
  return filasDe(tabla)[0];
}

vi.mock("@/shared/utils", () => ({
  formatDate: (d: Date) => d.toISOString(),
  formatTime: () => "",
}));
vi.mock("@/shared/services/archivos", () => ({
  subirArchivo: vi.fn(),
  borrarArchivo: vi.fn(),
  urlTemporal: vi.fn(),
}));
vi.mock("@/shared/services/supabase", () => ({
  supabase: {
    from(tabla: string) {
      return {
        insert(filas: FilaInsertada | FilaInsertada[]) {
          insertado[tabla] = filas;
          const respuesta = {
            select: () => ({
              single: () => Promise.resolve({ data: { id: "id-visita" }, error: null }),
            }),
          };
          /*
            `invitado` y `vehiculo_visita` no encadenan `.select()`, asi que lo
            que se devuelve es a la vez una promesa y un objeto con `.select()`.

            La conversion va contra `never` y no contra `any`: `never` encaja
            donde se espere cualquier cosa igual que `any`, pero **no deja leer
            nada** de lo convertido, asi que no se puede colar un uso de este
            doble como si fuera el cliente de verdad.
          */
          return Object.assign(
            Promise.resolve({ error: null }),
            respuesta,
          ) as never;
        },
      };
    },
  },
}));

const { crearVisita } = await import("./visitas.repo");

const BASE = {
  condominioId: "c1",
  unidadId: "u1",
  tipo: "amigos" as const,
  fechaDesde: "23/09/2026",
  fechaHasta: "23/09/2026",
  invitados: [{ nombre: "Quien llega" }, { nombre: "Acompañante" }],
};

beforeEach(() => {
  insertado = {};
});

describe("crearVisita", () => {
  it("si la portería la registra ya ingresada, sus invitados han llegado", async () => {
    await crearVisita({ ...BASE, estado: "ingresada" });

    const invitados = filasDe("invitado");
    expect(invitados).toHaveLength(2);
    for (const inv of invitados) {
      expect(inv.llego).toBe(true);
      // Y con hora, que es lo que dice cuándo entró cada uno.
      expect(inv.ingreso_en).toBeTruthy();
    }
  });

  it("y si queda programada, no ha llegado nadie todavía", async () => {
    await crearVisita({ ...BASE, estado: "programada" });

    for (const inv of filasDe("invitado")) {
      expect(inv.llego).toBe(false);
      expect(inv.ingreso_en).toBeNull();
    }
  });

  it("sin estado, se programa: quien registra desde su casa no abre la puerta", async () => {
    await crearVisita(BASE);

    expect(filaDe("visita").estado).toBe("programada");
    for (const inv of filasDe("invitado")) {
      expect(inv.llego).toBe(false);
    }
  });
});
