import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { entrarComo, salir, supabase } from "./cliente";
import {
  crearEstacionamiento,
  crearPorteria,
  crearTorre,
  crearUnidad,
  eliminarTorre,
  obtenerArquitectura,
} from "@/features/administrador/services/arquitectura.repo";

/**
 * Recorrido: la administración da de alta la estructura del edificio.
 *
 * Torre, vivienda, portería y estacionamiento. Es la base sobre la que se
 * apoya todo lo demás: sin unidad no hay membresía, sin membresía no hay
 * visitas ni reservas ni cuotas.
 *
 * Lo que este recorrido vigila de cerca:
 *
 *   · el número de torre lo calcula la base leyendo el máximo actual, no el
 *     cliente adivinando;
 *   · borrar una torre es un **borrado lógico**, porque las unidades
 *     históricas siguen apuntando a ella;
 *   · y nadie que no administre el condominio puede crear nada de esto.
 *
 * Todo lo que crea lleva marca y un sufijo irrepetible: `estacionamiento`
 * tiene `(condominio_id, codigo)` único, y una fila huérfana de una corrida
 * interrumpida tumbó la suite entera hace unas horas.
 */

const CONDOMINIO = "11111111-1111-1111-1111-111111111111";
const ADMIN = "admin@veciyo.test";
const VECINA = "vecino@veciyo.test";

const SUFIJO = String(Date.now()).slice(-6);
const MARCA = `[prueba] arq ${SUFIJO}`;

let torreId = "";
let unidadId = "";
const porterias: string[] = [];
const estacionamientos: string[] = [];

beforeAll(async () => {
  await entrarComo(ADMIN);
});

afterAll(async () => {
  await salir();
  await entrarComo(ADMIN);
  for (const id of estacionamientos) {
    await supabase.from("estacionamiento").delete().eq("id", id);
  }
  for (const id of porterias) {
    await supabase.from("porteria").delete().eq("id", id);
  }
  if (unidadId) await supabase.from("unidad").delete().eq("id", unidadId);
  if (torreId) await supabase.from("torre").delete().eq("id", torreId);
  await salir();
});

describe("la estructura del edificio", () => {
  it("una torre nueva toma el número siguiente, que lo pone la base", async () => {
    const { data: antes } = await supabase
      .from("torre")
      .select("numero")
      .eq("condominio_id", CONDOMINIO)
      .order("numero", { ascending: false })
      .limit(1);
    const maximoAntes = antes?.[0]?.numero ?? 0;

    await crearTorre(CONDOMINIO, { nombre: MARCA });

    const { data } = await supabase
      .from("torre")
      .select("id, numero, nombre")
      .eq("nombre", MARCA)
      .single();
    torreId = data!.id;
    // El correlativo sale del máximo actual: adivinarlo en el cliente daría
    // dos torres con el mismo número en cuanto dos personas creen a la vez.
    expect(data!.numero).toBe(maximoAntes + 1);
  });

  it("una vivienda cuelga de esa torre", async () => {
    await crearUnidad(CONDOMINIO, {
      torreId,
      codigo: `P${SUFIJO}`,
      piso: 9,
    });

    const { data } = await supabase
      .from("unidad")
      .select("id, codigo, piso, torre_id")
      .eq("codigo", `P${SUFIJO}`)
      .single();
    unidadId = data!.id;
    expect(data!.torre_id).toBe(torreId);
    expect(data!.piso).toBe(9);
  });

  it("una portería y un estacionamiento, con su tipo", async () => {
    await crearPorteria(CONDOMINIO, {
      nombre: `${MARCA} portería`,
      // El enum es `entrada_principal` / `acceso_vehicular`: una porteria es
      // una cosa o la otra, no un texto libre.
      tipo: "entrada_principal",
      ubicacion: "[prueba] entrada",
    });
    const { data: p } = await supabase
      .from("porteria")
      .select("id, tipo")
      .eq("nombre", `${MARCA} portería`)
      .single();
    porterias.push(p!.id);
    // `tipo` es un enum: una portería es principal o de servicio, no un texto
    // libre que cada quien escriba a su manera.
    expect(p!.tipo).toBe("entrada_principal");

    await crearEstacionamiento(CONDOMINIO, {
      codigo: `E${SUFIJO}`,
      tipo: "visitante",
      torreId,
    });
    const { data: e } = await supabase
      .from("estacionamiento")
      .select("id, tipo, torre_id")
      .eq("codigo", `E${SUFIJO}`)
      .single();
    estacionamientos.push(e!.id);
    expect(e!.tipo).toBe("visitante");
    expect(e!.torre_id).toBe(torreId);
  });

  it("y todo aparece junto cuando la pantalla lo pide", async () => {
    /*
      Ojo con `id`: las listas heredadas comparan numeros, asi que el
      repositorio deriva uno del uuid y lo pone en `id`. El identificador de
      verdad viaja en `uuid`, y es el que hay que mirar.
    */
    const arq = await obtenerArquitectura();
    expect(arq.torres.some((t: any) => t.uuid === torreId)).toBe(true);
    expect(arq.unidades.some((u: any) => u.uuid === unidadId)).toBe(true);
    expect(arq.porterias.some((p: any) => p.uuid === porterias[0])).toBe(true);
    expect(
      arq.estacionamientos.some((e: any) => e.uuid === estacionamientos[0]),
    ).toBe(true);
  });

  it("borrar una torre es lógico: las unidades siguen apuntando a ella", async () => {
    /*
      Una torre con historia no se puede hacer desaparecer: las unidades, las
      visitas y la correspondencia de años siguen colgando de ella. Se marca
      como borrada y deja de ofrecerse.
    */
    await eliminarTorre(torreId);

    const { data } = await supabase
      .from("torre")
      .select("deleted_at")
      .eq("id", torreId)
      .single();
    expect(data!.deleted_at).not.toBeNull();

    // Y la unidad sigue ahí, con su torre.
    const { data: u } = await supabase
      .from("unidad")
      .select("torre_id")
      .eq("id", unidadId)
      .single();
    expect(u!.torre_id).toBe(torreId);
  });

  it("pero una vecina no da de alta nada de esto", async () => {
    /*
      La estructura del edificio la lleva la administración. Si la cambiara
      cualquiera, alguien podría crearse una vivienda y con ella el acceso a
      todo lo que cuelga de una.
    */
    await salir();
    await entrarComo(VECINA);

    await expect(
      crearTorre(CONDOMINIO, { nombre: `${MARCA} intrusa` }),
    ).rejects.toThrow();

    await salir();
    await entrarComo(ADMIN);
    // Con una sesión que sí puede ver: "no la veo" no es "no se creó".
    const { count } = await supabase
      .from("torre")
      .select("id", { count: "exact", head: true })
      .eq("nombre", `${MARCA} intrusa`);
    expect(count).toBe(0);
  });
});
