import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { entrarComo, salir, servicio, supabase } from "./cliente";
import {
  crearAnuncio,
  misVotos,
  pendientesVotacion,
  votar,
} from "@/features/anuncios/services/anuncios.repo";

/**
 * Recorrido: quien tiene dos viviendas vota dos veces.
 *
 * Se le pregunto al cliente el 05/10/2026 que pasa con Guillermo, que es
 * propietario de la 101 y de la 205, y respondio: «pues si tiene 2 viviendas
 * puede votar 2 veces».
 *
 * Hasta entonces la regla era **por persona**, y eso rompia tres cosas:
 *
 *   · votaba una vez y la otra vivienda se quedaba sin voz;
 *   · el indice unico iba por `(publicacion, usuario, opcion)`;
 *   · y `pendientes_votacion` sacaba una vivienda de «no votaron» cuando **su
 *     propietario** habia votado, aunque fuera por la otra. O sea que el
 *     recuento de participacion salia mal: dos viviendas desaparecian con un
 *     solo voto.
 *
 * Y al cambiarlo aparecio un agujero: `voto.unidad_id` lo manda el cliente y
 * **nadie comprobaba que fuera suya**. Mientras el limite era por persona daba
 * igual --el segundo voto se rechazaba de todas formas--; con el limite por
 * vivienda, un vecino podria mandar el id de la 301 y gastarle el voto a
 * Marcela.
 */

const CONDOMINIO = "11111111-1111-1111-1111-111111111111";
const ADMIN = "admin@veciyo.test"; // Marcela: administra y es de la 301
const GUILLERMO = "propietario@veciyo.test"; // 101 y 205
const SOFIA = "vecino@veciyo.test"; // 102

const U101 = "44444444-4444-4444-4444-444444444441";
const U205 = "44444444-4444-4444-4444-444444444442";
const U301 = "44444444-4444-4444-4444-444444444444";

const MARCA = "[prueba] dos viviendas";

let encuesta = "";
let opciones: { id: string }[] = [];

beforeAll(async () => {
  await entrarComo(ADMIN);

  encuesta = await crearAnuncio({
    condominioId: CONDOMINIO,
    tipo: "encuesta",
    categoria: "Administración",
    titulo: `${MARCA} ¿cambiamos el portón?`,
    descripcion: "Una por vivienda",
    publicadaDesde: new Date(),
    paraPropietarios: true,
    paraResidentes: true,
    // Sin aviso: esta prueba no va de notificaciones y asi no llena la campana.
    avisar: false,
    opciones: ["Sí", "No"],
  });

  const { data } = await servicio
    .from("opcion_voto")
    .select("id, orden")
    .eq("publicacion_id", encuesta)
    .order("orden");
  opciones = data ?? [];
  expect(opciones.length).toBe(2);
});

afterAll(async () => {
  await salir();
  await servicio.from("voto").delete().eq("publicacion_id", encuesta);
  await servicio.from("opcion_voto").delete().eq("publicacion_id", encuesta);
  const { error } = await servicio.from("publicacion").delete().eq("id", encuesta);
  // Una limpieza que no comprueba si limpió no es una limpieza.
  expect(error).toBeNull();
});

describe("una vivienda, un voto", () => {
  it("Guillermo vota por la 101", async () => {
    await salir();
    await entrarComo(GUILLERMO);

    await votar(encuesta, opciones[0].id, U101);

    const mios = await misVotos(encuesta);
    expect(mios.length).toBe(1);
    expect(mios[0].unidadId).toBe(U101);
    expect(mios[0].codigo).toBe("101");
  });

  it("y la 205 sigue faltando, que es lo que antes se perdía", async () => {
    /*
      Aquí, con **una sola** de sus dos viviendas votada, es donde se ve el
      defecto: la versión vieja de `pendientes_votacion` excluía una vivienda
      cuando **su propietario** había votado, aunque fuera por la otra. O sea
      que este voto escondía las dos.

      Y tiene que ir aquí y no al final: con las dos votadas, las dos versiones
      dan la misma respuesta y el caso no distingue nada. Comprobado mutando.
    */
    await salir();
    try {
      await entrarComo(ADMIN);
      const faltan = (await pendientesVotacion(encuesta)).map((f) => f.unidad);
      expect(faltan).toContain("205");
      expect(faltan).not.toContain("101");
    } finally {
      await salir();
      await entrarComo(GUILLERMO);
    }
  });

  it("y después por la 205, que es el caso que no se podía", async () => {
    /*
      Esto es lo que pidió el cliente. Antes la base respondía «Esta encuesta
      admite un solo voto por persona» y la 205 se quedaba sin voz.
    */
    await votar(encuesta, opciones[1].id, U205);

    const mios = await misVotos(encuesta);
    expect(mios.length).toBe(2);
    expect(mios.map((v) => v.codigo).sort()).toEqual(["101", "205"]);
    // Y cada una votó lo suyo: no es un voto duplicado, son dos votos.
    expect(new Set(mios.map((v) => v.opcionUuid)).size).toBe(2);
  });

  it("pero la misma vivienda no vota dos veces", async () => {
    await expect(votar(encuesta, opciones[1].id, U101)).rejects.toThrow(
      /vivienda ya voto|ya votó/i,
    );
  });

  it("ni se le gasta el voto a la vivienda de otro", async () => {
    /*
      El agujero que destapa el cambio. Guillermo manda el id de la 301, que es
      de Marcela. Lo rechaza la política, no el disparador: es un permiso, no
      una regla de recuento.
    */
    await expect(votar(encuesta, opciones[0].id, U301)).rejects.toThrow();

    const { data } = await servicio
      .from("voto")
      .select("id")
      .eq("publicacion_id", encuesta)
      .eq("unidad_id", U301);
    expect(data ?? []).toEqual([]);
  });

  it("y la 301 sigue pudiendo votar lo suyo", async () => {
    // El control positivo: sin él, «no se pudo votar por la 301» pasaría igual
    // con la votación rota del todo.
    await salir();
    try {
      await entrarComo(ADMIN);
      await votar(encuesta, opciones[0].id, U301);

      const mios = await misVotos(encuesta);
      expect(mios.map((v) => v.codigo)).toContain("301");
    } finally {
      await salir();
      await entrarComo(GUILLERMO);
    }
  });
});

describe("quién falta por votar", () => {
  it("se cuenta por vivienda, no por persona", async () => {
    /*
      El defecto que el cliente destapó sin querer. Guillermo votó por sus dos
      viviendas y Marcela por la suya, así que de las cuatro del edificio solo
      debería faltar la 102.

      Antes bastaba con que el propietario hubiera votado **una vez** para que
      todas sus viviendas desaparecieran de la lista.
    */
    await salir();
    try {
      await entrarComo(ADMIN);
      const faltan = await pendientesVotacion(encuesta);
      const codigos = faltan.map((f) => f.unidad).sort();

      expect(codigos).toEqual(["102"]);
    } finally {
      await salir();
      await entrarComo(GUILLERMO);
    }
  });

  it("y al votar la última, no falta ninguna", async () => {
    await salir();
    try {
      await entrarComo(SOFIA);
      await votar(encuesta, opciones[1].id, "44444444-4444-4444-4444-444444444443");
    } finally {
      await salir();
      await entrarComo(ADMIN);
    }

    const faltan = await pendientesVotacion(encuesta);
    expect(faltan).toEqual([]);
  });

  it("y el recuento son cuatro votos, uno por vivienda", async () => {
    // Lo que no miente: contar. Cuatro viviendas, cuatro votos.
    const { count } = await servicio
      .from("voto")
      .select("id", { count: "exact", head: true })
      .eq("publicacion_id", encuesta);

    expect(count).toBe(4);
  });
});

describe("quien no tiene vivienda", () => {
  it("vota una vez, como persona", async () => {
    /*
      La portería puede votar hoy --`voto_propio_escritura` solo pide ser
      miembro del condominio-- y su voto no lleva vivienda. No se le quita:
      no se ha pedido, y quitarlo sería decidir por mi cuenta quién tiene voz
      en una asamblea. Para ella la regla sigue siendo una por persona.
    */
    await salir();
    try {
      const guardiaId = await entrarComo("guardia@veciyo.test");
      await votar(encuesta, opciones[0].id);

      const { data } = await servicio
        .from("voto")
        .select("id, unidad_id")
        .eq("publicacion_id", encuesta)
        .eq("usuario_id", guardiaId);
      expect(data!.length).toBe(1);
      expect(data![0].unidad_id).toBeNull();

      // Y no dos.
      await expect(votar(encuesta, opciones[1].id)).rejects.toThrow(
        /un solo voto por persona/i,
      );
    } finally {
      await salir();
      await entrarComo(ADMIN);
    }
  });
});
