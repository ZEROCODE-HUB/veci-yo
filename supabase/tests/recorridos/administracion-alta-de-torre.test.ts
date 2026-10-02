import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { entrarComo, salir, servicio, supabase } from "./cliente";
import {
  crearTorre,
  obtenerArquitectura,
} from "@/features/administrador/services/arquitectura.repo";

/**
 * Recorrido: dar de alta una torre crea lo que el formulario promete.
 *
 * El alta pedía tres cosas que no producían nada: el rango de numeración --con
 * una vista previa que decía literalmente «Se generarán 5 unidades: 101 a
 * 105»--, las cocheras de visita y los almacenes. Se guardaban como números en
 * la torre y ahí se quedaban.
 *
 * La consecuencia se veía en dos pantallas del **mismo** administrador: la de
 * Torres decía que la Torre 3 tenía diez cocheras de visita, y la de Inicio
 * «1 de 1 disponibles», porque la única plaza que existía no estaba en ninguna
 * torre. Los dos números no se hablaban (R-35).
 *
 * Decidido con el cliente el 02/10/2026: **que se construyan**.
 *
 * Se llama a la función del repositorio de la aplicación, no a HTTP crudo, que
 * es donde vivía la mitad de los defectos de este proyecto.
 */
const CONDOMINIO = "11111111-1111-1111-1111-111111111111";
const ADMIN = "admin@veciyo.test";

let torreId = "";

beforeAll(async () => {
  await entrarComo(ADMIN);
});

afterAll(async () => {
  /*
    Con la clave de servicio y en orden: las viviendas y las plazas cuelgan de
    la torre, y el disparador nuevo impide borrarla mientras tenga viviendas
    --que es justo lo que se añadió hoy--.
  */
  if (torreId) {
    await servicio.from("estacionamiento").delete().eq("torre_id", torreId);
    await servicio.from("unidad").delete().eq("torre_id", torreId);
    await servicio.from("torre").delete().eq("id", torreId);
  }

  const { data } = await servicio
    .from("torre")
    .select("id")
    .eq("id", torreId || "00000000-0000-0000-0000-000000000000");
  expect(data ?? []).toHaveLength(0);

  await salir();
});

describe("dar de alta una torre con su rango y sus cocheras", () => {
  it("crea la torre", async () => {
    await crearTorre(CONDOMINIO, {
      nombre: "[prueba] Torre que se construye",
      nomenclaturaDesde: "901",
      nomenclaturaHasta: "905",
      cocherasVisitas: "3",
    });

    const { data } = await supabase
      .from("torre")
      .select("id, numero")
      .eq("nombre", "[prueba] Torre que se construye")
      .single();

    expect(data).toBeTruthy();
    torreId = data!.id;
  });

  it("y las cinco viviendas del rango, con su piso", async () => {
    const { data } = await supabase
      .from("unidad")
      .select("codigo, piso")
      .eq("torre_id", torreId)
      .order("codigo");

    expect((data ?? []).map((u) => u.codigo)).toEqual([
      "901",
      "902",
      "903",
      "904",
      "905",
    ]);
    // Las dos últimas cifras son la puerta y lo de delante el piso, que es la
    // convención que ya siguen los datos del edificio.
    expect(new Set((data ?? []).map((u) => u.piso))).toEqual(new Set([9]));
  });

  it("y las tres cocheras de visita, en esa torre", async () => {
    const { data } = await supabase
      .from("estacionamiento")
      .select("codigo, tipo, torre_id")
      .eq("torre_id", torreId);

    expect(data).toHaveLength(3);
    for (const plaza of data ?? []) {
      expect(plaza.tipo).toBe("visitante");
      // Llevan el número de torre: la placa es única en el condominio, no en
      // la torre.
      expect(plaza.codigo).toMatch(/^V\d+-\d{2}$/);
    }
  });

  it("y ahora los dos números cuadran, que era el defecto", async () => {
    /*
      Lo que se discutía en la puerta: la administración escribía diez y las
      veía en su pantalla; la portería solo podía asignar las que existieran.
    */
    const arquitectura = await obtenerArquitectura();
    const torre = arquitectura.torres.find((t) => t.uuid === torreId);
    expect(torre, "la torre tiene que estar en la arquitectura").toBeTruthy();

    // La arquitectura devuelve el **numero** de torre de cada plaza, no su id.
    const plazasReales = arquitectura.estacionamientos.filter(
      (e) => e.torreNumero === torre!.numero,
    );

    expect(Number(torre?.cocherasVisitas ?? 0)).toBe(plazasReales.length);
  });
});

describe("lo que no se genera", () => {
  it("un rango al revés no inventa nada", async () => {
    /*
      Y no revienta el alta: la torre es lo que se pidió, y un rango imposible
      es un dato mal tecleado, no un motivo para no crear la torre.
    */
    await crearTorre(CONDOMINIO, {
      nombre: "[prueba] Torre sin rango",
      nomenclaturaDesde: "500",
      nomenclaturaHasta: "100",
    });

    const { data: torre } = await supabase
      .from("torre")
      .select("id")
      .eq("nombre", "[prueba] Torre sin rango")
      .single();

    const { data: unidades } = await supabase
      .from("unidad")
      .select("id")
      .eq("torre_id", torre!.id);

    expect(unidades ?? []).toHaveLength(0);

    await servicio.from("torre").delete().eq("id", torre!.id);
  });
});
