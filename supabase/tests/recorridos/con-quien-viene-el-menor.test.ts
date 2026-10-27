import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { enDias, entrarComo, retirarEstancia, salir, servicio } from "./cliente";
import { crearVisita } from "@/features/visitas/services/visitas.repo";

/**
 * Recorrido: con quién viene el menor de una visita corriente (27/10/2026,
 * hueco 36).
 *
 * Por el camino de la pantalla: `crearVisita` con el adulto y el parentesco
 * del menor. La primera versión mandaba solo el adulto, la base lo rechazó
 * (`invitado_responsable_coherente` pide los dos) y la visita quedó creada a
 * medias. Salió recorriendo el formulario en el navegador.
 */

const CONDOMINIO = "11111111-1111-1111-1111-111111111111";
const U102 = "44444444-4444-4444-4444-444444444443";
const VECINA = "vecino@veciyo.test";
const MARCA = "[prueba] con quien viene";

const creadas: string[] = [];

async function invitados(visita: string) {
  const { data } = await servicio
    .from("invitado")
    .select("id, nombre, es_menor, responsable_id, parentesco")
    .eq("visita_id", visita)
    .order("orden");
  return data ?? [];
}

beforeAll(async () => {
  const { data } = await servicio.from("visita").select("id").eq("anotaciones_ingreso", MARCA);
  for (const v of data ?? []) await retirarEstancia(v.id);
});

afterAll(async () => {
  await salir();
  for (const id of creadas) {
    const { error } = await retirarEstancia(id);
    if (error) throw new Error(`No se pudo retirar la visita ${id}: ${error.message}`);
  }
});

describe("el menor de una visita corriente", () => {
  it("queda con el adulto con quien viene y qué es de él", async () => {
    await entrarComo(VECINA);
    const id = await crearVisita({
      condominioId: CONDOMINIO,
      unidadId: U102,
      tipo: "amigos",
      fechaDesde: enDias(2),
      anotacionesIngreso: MARCA,
      invitados: [
        { nombre: `${MARCA} Rosa` },
        { nombre: `${MARCA} Pedro` },
        { nombre: `${MARCA} Lucas`, esMenor: true, responsableOrden: 1, parentesco: "padre" },
      ],
    });
    await salir();
    creadas.push(id);

    const [, pedro, lucas] = await invitados(id);
    expect(lucas.responsable_id).toBe(pedro.id);
    expect(lucas.parentesco).toBe("padre");
  });

  it("y si la base lo rechaza, la visita no se queda a medias", async () => {
    await entrarComo(VECINA);
    await expect(
      crearVisita({
        condominioId: CONDOMINIO,
        unidadId: U102,
        tipo: "amigos",
        fechaDesde: enDias(3),
        anotacionesIngreso: MARCA,
        invitados: [
          { nombre: `${MARCA} Ana` },
          // Un menor no responde por otro menor.
          { nombre: `${MARCA} Nico`, esMenor: true },
          { nombre: `${MARCA} Leo`, esMenor: true, responsableOrden: 1, parentesco: "otro" },
        ],
      }),
    ).rejects.toThrow(/menor no puede responder/);
    await salir();

    const { data } = await servicio
      .from("invitado")
      .select("id")
      .eq("nombre", `${MARCA} Ana`);
    expect(data ?? []).toHaveLength(0);
  });
});
