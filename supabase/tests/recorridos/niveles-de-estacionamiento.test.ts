import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { entrarComo, salir, servicio, supabase } from "./cliente";
import {
  crearEstacionamiento,
  crearNiveles,
  eliminarNivel,
  obtenerArquitectura,
} from "@/features/administrador/services/arquitectura.repo";

/**
 * Los niveles de estacionamiento (16/11/2026). El cliente: «Niveles de
 * estacionamiento que hay, cómo se llama y su nomenclatura» y «Ubicación
 * obligatoria al crear Estacionamiento».
 *
 * Lo que vigila:
 *   · los escribe solo la administración del edificio: la vecina los lee y no
 *     los toca;
 *   · otro edificio no los ve ni los escribe (con su control positivo: Renata
 *     sí ve los suyos);
 *   · un estacionamiento no puede apuntar al nivel de otro edificio;
 *   · y crear un estacionamiento sin nivel no se puede, ni desde el
 *     repositorio.
 */
const CONDOMINIO = "11111111-1111-1111-1111-111111111111";
const AJENO = "22222222-2222-2222-2222-222222222222";
const ADMIN = "admin@veciyo.test";
const VECINA = "vecino@veciyo.test";
const ADMIN_AJENA = "admin2@veciyo.test";

// Nomenclatura irrepetible por corrida: (condominio, nomenclatura) es único.
const SUFIJO = String(Date.now()).slice(-4);
const NOM = `Q${SUFIJO}`;
const NOM_AJENO = `R${SUFIJO}`;

let nivelId = "";
let nivelAjenoId = "";
const estacionamientos: string[] = [];

/** Lo que se creó, por su id: no se borra nada por atributos. */
async function limpiar() {
  if (estacionamientos.length) {
    const { error } = await servicio.from("estacionamiento").delete().in("id", estacionamientos);
    expect(error).toBeNull();
  }
  // Por si una corrida anterior murió a medias: solo las marcas de esta forma
  // en el edificio de pruebas y en el de Renata.
  const { error } = await servicio
    .from("nivel_estacionamiento")
    .delete()
    .in("condominio_id", [CONDOMINIO, AJENO])
    .like("nombre", "[prueba] nivel%");
  expect(error).toBeNull();
}

beforeAll(async () => {
  await limpiar();
  const { data, error } = await servicio
    .from("nivel_estacionamiento")
    .insert({ condominio_id: AJENO, nombre: "[prueba] nivel ajeno", nomenclatura: NOM_AJENO })
    .select("id")
    .single();
  expect(error).toBeNull();
  nivelAjenoId = data!.id;
});

afterAll(async () => {
  await salir();
  await limpiar();
  const { data } = await servicio
    .from("nivel_estacionamiento")
    .select("id")
    .like("nombre", "[prueba] nivel%");
  expect(data ?? []).toHaveLength(0);
});

describe("la administración", () => {
  it("crea un nivel y lo ve en la arquitectura", async () => {
    await entrarComo(ADMIN);
    await crearNiveles(CONDOMINIO, [{ nombre: "[prueba] nivel sótano", nomenclatura: NOM }]);

    const arquitectura = await obtenerArquitectura();
    const nivel = arquitectura.niveles.find((n) => n.nomenclatura === NOM);
    expect(nivel?.nombre).toBe("[prueba] nivel sótano");
    nivelId = nivel!.uuid;
  });

  it("no repite nomenclatura en el edificio", async () => {
    await expect(
      crearNiveles(CONDOMINIO, [{ nombre: "[prueba] nivel otra vez", nomenclatura: NOM }]),
    ).rejects.toThrow(/Ya hay un nivel con esa nomenclatura/);
  });

  it("crea un estacionamiento en ese nivel, y sin nivel no", async () => {
    await crearEstacionamiento(CONDOMINIO, {
      codigo: `${NOM}-01`,
      tipo: "visitante",
      nivelId,
    });
    const { data } = await supabase
      .from("estacionamiento")
      .select("id, nivel_id")
      .eq("condominio_id", CONDOMINIO)
      .eq("codigo", `${NOM}-01`)
      .single();
    estacionamientos.push(data!.id);
    expect(data!.nivel_id).toBe(nivelId);

    await expect(
      crearEstacionamiento(CONDOMINIO, { codigo: `${NOM}-02`, tipo: "visitante", nivelId: "" }),
    ).rejects.toThrow(/Elige el nivel/);
  });

  it("un nivel con estacionamientos no se quita, y dice cuántos tiene", async () => {
    await expect(eliminarNivel(nivelId)).rejects.toThrow(/tiene 1 estacionamiento/);
  });

  it("un estacionamiento no puede ir en el nivel de otro edificio", async () => {
    const { error } = await supabase
      .from("estacionamiento")
      .insert({ condominio_id: CONDOMINIO, codigo: `${NOM}-X`, tipo: "visitante", nivel_id: nivelAjenoId });
    expect(error?.code).toBe("23503");
  });
});

describe("la vecina", () => {
  it("lee los niveles de su edificio", async () => {
    await entrarComo(VECINA);
    const { data } = await supabase.from("nivel_estacionamiento").select("id").eq("id", nivelId);
    expect(data).toHaveLength(1);
  });

  it("no crea niveles", async () => {
    const { error } = await supabase
      .from("nivel_estacionamiento")
      .insert({ condominio_id: CONDOMINIO, nombre: "[prueba] nivel de la vecina", nomenclatura: `V${SUFIJO}` });
    expect(error?.code).toBe("42501");
  });

  it("ni los cambia ni los borra", async () => {
    await supabase.from("nivel_estacionamiento").update({ nombre: "[prueba] nivel cambiado" }).eq("id", nivelId);
    await supabase.from("nivel_estacionamiento").delete().eq("id", nivelId);
    const { data } = await servicio.from("nivel_estacionamiento").select("nombre").eq("id", nivelId).single();
    expect(data?.nombre).toBe("[prueba] nivel sótano");
  });
});

describe("otro edificio", () => {
  it("no ve los niveles de aquí, y sí los suyos", async () => {
    await entrarComo(ADMIN_AJENA);
    const { data } = await supabase.from("nivel_estacionamiento").select("id, condominio_id");
    const ids = (data ?? []).map((n) => n.id);
    expect(ids).not.toContain(nivelId);
    // El control positivo: si no viera ninguno, lo de arriba no probaría nada.
    expect(ids).toContain(nivelAjenoId);
  });

  it("no crea niveles en este edificio", async () => {
    const { error } = await supabase
      .from("nivel_estacionamiento")
      .insert({ condominio_id: CONDOMINIO, nombre: "[prueba] nivel intruso", nomenclatura: `I${SUFIJO}` });
    expect(error?.code).toBe("42501");
  });
});
