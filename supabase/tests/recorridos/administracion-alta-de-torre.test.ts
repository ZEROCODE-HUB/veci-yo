import { obtenerParametrosPublicos } from "@/shared/services/parametros.repo";
import { parametroNumero } from "@/shared/services/parametros";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { entrarComo, salir, servicio, supabase } from "./cliente";
import {
  crearTorre,
  obtenerArquitectura,
} from "@/features/administrador/services/arquitectura.repo";

/** El tope de la torre es un parámetro de la base: se lee de ahí, como hace la pantalla. */
async function reglasDeTorre() {
  const p = await obtenerParametrosPublicos(CONDOMINIO);
  return { viviendasMaximo: parametroNumero(p, "torre_viviendas_maximo") };
}

/**
 * Recorrido: dar de alta una torre crea lo que el formulario promete.
 *
 * Hasta el 02/10/2026 el alta pedía cosas que no producían nada --el rango de
 * numeración con su vista previa, las cocheras de visita-- y la pantalla de
 * Torres decía diez cocheras donde la portería solo podía asignar una (R-35).
 *
 * Desde el 16/11/2026 el alta pide «del piso X al Y, N por piso» con números
 * o letras, y los estacionamientos por nivel («S1-01», «S1-V01»). El cliente:
 * «pone 3 departamentos del piso 5 al 7, ah entonces se van a crear 9».
 *
 * Se llama a la función del repositorio de la aplicación, no a HTTP crudo, que
 * es donde vivía la mitad de los defectos de este proyecto.
 */
const CONDOMINIO = "11111111-1111-1111-1111-111111111111";
const ADMIN = "admin@veciyo.test";
const NOMBRE = "[prueba] Torre que se construye";
// Una nomenclatura irrepetible: (condominio, nomenclatura) es único.
const NOM = `Z${String(Date.now()).slice(-4)}`;
// Pisos altos y con letra: ningún departamento del edificio de pruebas se llama así.
const PISOS = { desde: 90, hasta: 92, porPiso: 3, numeracion: "letra" as const };

let torreId = "";

/** Lo de esta prueba, por su torre y su marca: nunca por atributos sueltos. */
async function limpiar() {
  const { data: torres } = await servicio
    .from("torre")
    .select("id")
    .eq("condominio_id", CONDOMINIO)
    .eq("nombre", NOMBRE);
  for (const t of torres ?? []) {
    const e = await servicio.from("estacionamiento").delete().eq("torre_id", t.id);
    expect(e.error).toBeNull();
    const u = await servicio.from("unidad").delete().eq("torre_id", t.id);
    expect(u.error).toBeNull();
    const r = await servicio.from("torre").delete().eq("id", t.id);
    expect(r.error).toBeNull();
  }
  const n = await servicio
    .from("nivel_estacionamiento")
    .delete()
    .eq("condominio_id", CONDOMINIO)
    .like("nombre", "[prueba] torre nivel%");
  expect(n.error).toBeNull();
}

beforeAll(async () => {
  await limpiar();
  await entrarComo(ADMIN);
});

afterAll(async () => {
  await salir();
  await limpiar();
  const { data } = await servicio.from("torre").select("id").eq("nombre", NOMBRE);
  expect(data ?? []).toHaveLength(0);
});

describe("dar de alta una torre con sus pisos y sus niveles", () => {
  it("crea la torre", async () => {
    await crearTorre(CONDOMINIO, { nombre: NOMBRE }, await reglasDeTorre(), {
      departamentos: PISOS,
      estacionamientos: [
        { nombre: "[prueba] torre nivel", nomenclatura: NOM, privados: 3, visita: 2 },
      ],
    });

    const { data } = await supabase
      .from("torre")
      .select("id, cocheras_privadas, cocheras_visitas, nomenclatura_desde, nomenclatura_hasta")
      .eq("nombre", NOMBRE)
      .single();

    expect(data).toBeTruthy();
    torreId = data!.id;
    // La tarjeta de la torre cuenta lo que se creó, no lo que alguien escribió.
    expect(data!.cocheras_privadas).toBe(3);
    expect(data!.cocheras_visitas).toBe(2);
    expect([data!.nomenclatura_desde, data!.nomenclatura_hasta]).toEqual(["90A", "92C"]);
  });

  it("y los nueve departamentos, cada uno con su piso escrito", async () => {
    const { data } = await supabase
      .from("unidad")
      .select("codigo, piso")
      .eq("torre_id", torreId)
      .order("codigo");

    expect((data ?? []).map((u) => u.codigo)).toEqual([
      "90A", "90B", "90C", "91A", "91B", "91C", "92A", "92B", "92C",
    ]);
    // Con letras no hay división que valga: el piso viene del formulario.
    expect(data!.find((u) => u.codigo === "91B")?.piso).toBe(91);
  });

  it("y el nivel nuevo con sus estacionamientos, con la nomenclatura en el código", async () => {
    const { data: nivel } = await supabase
      .from("nivel_estacionamiento")
      .select("id, nombre")
      .eq("condominio_id", CONDOMINIO)
      .eq("nomenclatura", NOM)
      .single();
    expect(nivel?.nombre).toBe("[prueba] torre nivel");

    const { data } = await supabase
      .from("estacionamiento")
      .select("codigo, tipo, nivel_id")
      .eq("torre_id", torreId)
      .order("codigo");
    expect((data ?? []).map((e) => [e.codigo, e.tipo])).toEqual([
      [`${NOM}-01`, "privado"],
      [`${NOM}-02`, "privado"],
      [`${NOM}-03`, "privado"],
      [`${NOM}-V01`, "visitante"],
      [`${NOM}-V02`, "visitante"],
    ]);
    expect(new Set((data ?? []).map((e) => e.nivel_id))).toEqual(new Set([nivel!.id]));
  });

  it("y la arquitectura enseña el nivel junto a cada uno", async () => {
    const arquitectura = await obtenerArquitectura();
    const torre = arquitectura.torres.find((t) => t.uuid === torreId);
    const suyos = arquitectura.estacionamientos.filter((e) => e.torreNumero === torre!.numero);
    expect(suyos).toHaveLength(5);
    expect(new Set(suyos.map((e) => e.nivel))).toEqual(new Set(["[prueba] torre nivel"]));
  });
});

describe("lo que no se genera", () => {
  it("pisos al revés se rechazan diciendo por qué, y no dejan la torre a medias", async () => {
    await expect(
      crearTorre(CONDOMINIO, { nombre: `${NOMBRE} al revés` }, await reglasDeTorre(), {
        departamentos: { desde: 7, hasta: 5, porPiso: 3, numeracion: "numero" },
      }),
    ).rejects.toThrow(/no puede ser menor/);

    const { data: torres } = await servicio
      .from("torre")
      .select("id")
      .eq("nombre", `${NOMBRE} al revés`);
    expect(torres ?? []).toHaveLength(0);
  });

  it("departamentos que ya existen tampoco: no se crea nada", async () => {
    await expect(
      crearTorre(CONDOMINIO, { nombre: `${NOMBRE} repetida` }, await reglasDeTorre(), {
        departamentos: PISOS,
      }),
    ).rejects.toThrow(/Ya hay viviendas con esos números/);

    const { data: torres } = await servicio
      .from("torre")
      .select("id")
      .eq("nombre", `${NOMBRE} repetida`);
    expect(torres ?? []).toHaveLength(0);
  });
});
