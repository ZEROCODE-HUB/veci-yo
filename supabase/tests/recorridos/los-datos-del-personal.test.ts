import { afterAll, describe, expect, it } from "vitest";
import { entrarComo, salir, supabase } from "./cliente";
import { obtenerGuardiasDeTurno } from "@/features/home/services/chat.repo";

/**
 * Recorrido: los datos del personal no los ve cualquier vecino (15/10/2026,
 * hueco 33).
 *
 * `membresia_condominio` guarda el documento y el teléfono de cada guardia, y
 * la leía cualquiera que viviera en el edificio. Un vecino solo necesita el
 * nombre de los guardias de turno, que es lo que pinta el chat.
 */

const CONDOMINIO = "11111111-1111-1111-1111-111111111111";
const VECINA = "vecino@veciyo.test"; // Sofía
const ADMIN = "admin@veciyo.test"; // Marcela
const GUARDIA = "guardia@veciyo.test"; // Juan

const filasDeGuardias = async () => {
  const { data } = await supabase
    .from("membresia_condominio")
    .select("id, telefono, documento")
    .eq("condominio_id", CONDOMINIO)
    .eq("rol", "guardia");
  return data ?? [];
};

afterAll(async () => {
  await salir();
});

describe("los datos de los guardias", () => {
  it("la administración los ve", async () => {
    // El control: sin él, el caso de abajo pasaría igual si no hubiera guardias.
    await entrarComo(ADMIN);
    const filas = await filasDeGuardias();
    await salir();
    expect(filas.length).toBeGreaterThan(0);
  });

  it("el guardia ve su propia fila", async () => {
    await entrarComo(GUARDIA);
    const filas = await filasDeGuardias();
    await salir();
    expect(filas.length).toBeGreaterThan(0);
  });

  it("una vecina no ve ni el documento ni el teléfono de ninguno", async () => {
    await entrarComo(VECINA);
    const filas = await filasDeGuardias();
    await salir();
    expect(filas).toEqual([]);
  });

  it("pero sí pide los nombres de los de turno sin error, como hace el chat", async () => {
    await entrarComo(VECINA);
    const nombres = await obtenerGuardiasDeTurno(CONDOMINIO);
    await salir();
    expect(Array.isArray(nombres)).toBe(true);
  });

  it("y alguien de otro edificio no saca ningún nombre", async () => {
    await entrarComo("vecino2@veciyo.test");
    const { data } = await supabase.rpc("nombres_de_guardias_de_turno", { p_condominio_id: CONDOMINIO });
    await salir();
    expect(data).toEqual([]);
  });
});
