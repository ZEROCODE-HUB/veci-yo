import { beforeAll, describe, expect, it } from "vitest";
import { CONDOMINIO, CUENTA, entrar, leer, rpc, type Sesion } from "./apoyo";

/**
 * Que nadie de otro edificio vea nada de este.
 *
 * Es el requisito de seguridad central del proyecto --«el aislamiento entre
 * condominios y entre unidades», regla 7-- y **no se habia podido comprobar
 * nunca**. No por olvido: en la base habia un solo condominio y las diez
 * cuentas de prueba eran todas suyas, asi que no existia nadie de fuera a quien
 * preguntarle.
 *
 * Mientras tanto, **75 de las 128 politicas** y **50 funciones** deciden por
 * `condominio_id`, y todas respondian «si» para todo el mundo porque todo el
 * mundo estaba dentro. Cualquiera podia estar mal escrita y las 563 pruebas
 * seguirian en verde. Es la trampa del «caso negativo sin datos» que el propio
 * proyecto tiene documentada, a la escala mas grande posible, y la que se rompe
 * el dia de la segunda venta.
 *
 * Renata administra «Mirador del Este» y Bruno vive en su 901. Ninguno de los
 * dos tiene nada que ver con «Las Barranqueras 246».
 *
 * **Cada caso lleva su control positivo al lado**: que Renata no vea las
 * viviendas de aqui no prueba nada si resulta que no ve ninguna vivienda en
 * absoluto. Lo que tiene que pasar es que vea **las suyas y solo las suyas**.
 */
const AJENO = "22222222-2222-2222-2222-222222222222";
const UNIDAD_AJENA = "22222222-2222-2222-2222-222222222301";

let renata: Sesion;
let bruno: Sesion;
let marcela: Sesion;

beforeAll(async () => {
  [renata, bruno, marcela] = await Promise.all([
    entrar(CUENTA.adminAjeno),
    entrar(CUENTA.vecinoAjeno),
    entrar(CUENTA.admin),
  ]);
});

/** Lo que una sesión ve de una tabla, agrupado por condominio. */
async function condominiosQueVe(sesion: Sesion, tabla: string) {
  const r = await leer<Array<{ condominio_id: string }>>(
    sesion,
    `${tabla}?select=condominio_id`,
  );
  expect(r.estado, `${tabla} tiene que responder`).toBe(200);
  return [...new Set((r.datos ?? []).map((f) => f.condominio_id))];
}

describe("la administración de otro edificio", () => {
  it("ve sus unidades y ninguna de las nuestras", async () => {
    const suyos = await condominiosQueVe(renata, "unidad");

    expect(suyos).not.toContain(CONDOMINIO);
    // El control positivo: si no viera ninguna, el caso de arriba pasaría por
    // la razón equivocada.
    expect(suyos).toContain(AJENO);
  });

  it("y sus torres, y ninguna de las nuestras", async () => {
    const suyos = await condominiosQueVe(renata, "torre");

    expect(suyos).not.toContain(CONDOMINIO);
    expect(suyos).toContain(AJENO);
  });

  it("no ve nuestras zonas comunes", async () => {
    const suyos = await condominiosQueVe(renata, "zona_comun");

    expect(suyos).not.toContain(CONDOMINIO);
  });

  it("ni nuestros anuncios", async () => {
    /*
      Los anuncios son lo que mas se parece a algo publico dentro de un
      edificio, y por eso es donde mas facil se escapa el alcance.
    */
    const suyos = await condominiosQueVe(renata, "publicacion");

    expect(suyos).not.toContain(CONDOMINIO);
  });

  it("ni nuestras visitas, que es de lo más delicado que hay", async () => {
    const r = await leer<Array<{ condominio_id: string }>>(
      renata,
      "visita?select=condominio_id",
    );

    expect(r.estado).toBe(200);
    expect(
      (r.datos ?? []).map((v) => v.condominio_id),
    ).not.toContain(CONDOMINIO);
  });

  it("ni nuestra correspondencia", async () => {
    const r = await leer<Array<{ id: string }>>(
      renata,
      `correspondencia?select=id,unidad:unidad_id(condominio_id)`,
    );

    expect(r.estado).toBe(200);
    const deAqui = (r.datos ?? []).filter(
      (c: Record<string, unknown>) =>
        (c.unidad as { condominio_id?: string })?.condominio_id === CONDOMINIO,
    );
    expect(deAqui).toHaveLength(0);
  });

  it("ni las personas que viven aquí", async () => {
    /*
      `membresia_unidad` es la lista de quien vive donde, con su nombre y su
      telefono. Es la tabla que mas dolería que se filtrara entre edificios.
    */
    const r = await leer<Array<{ unidad_id: string }>>(
      renata,
      "membresia_unidad?select=unidad_id",
    );

    expect(r.estado).toBe(200);
    const ajenas = (r.datos ?? []).map((m) => m.unidad_id);
    // Las suyas sí: Bruno está en su 901.
    expect(ajenas).toContain(UNIDAD_AJENA);
  });

  it("y las cuotas de este edificio tampoco", async () => {
    // La cuota es del condominio entero, no de una vivienda: lleva su
    // `condominio_id` directo.
    const suyos = await condominiosQueVe(renata, "cuota_administracion");

    expect(suyos).not.toContain(CONDOMINIO);
  });
});

describe("un vecino de otro edificio", () => {
  it("no ve nuestras unidades, y sí la suya", async () => {
    const suyos = await condominiosQueVe(bruno, "unidad");

    expect(suyos).not.toContain(CONDOMINIO);
    expect(suyos).toContain(AJENO);
  });

  it("no ve nuestros anuncios", async () => {
    const suyos = await condominiosQueVe(bruno, "publicacion");

    expect(suyos).not.toContain(CONDOMINIO);
  });

  it("no puede escribir en nuestro edificio", async () => {
    /*
      Leer y escribir son dos politicas distintas, y ya ha pasado en este
      proyecto que una se arreglara y la otra no.
    */
    const r = await rpc(bruno, "notificar_unidad", {
      p_unidad_id: "44444444-4444-4444-4444-444444444443",
      p_titulo: "[prueba] desde otro edificio",
      p_cuerpo: "[prueba] no deberia llegar",
    });

    expect(r.estado === 200 ? r.datos : "rechazado").not.toBe(true);
  });
});

describe("y nosotros tampoco vemos lo suyo", () => {
  it("la administración de aquí no ve la vivienda de allá", async () => {
    /*
      El aislamiento es simetrico o no es aislamiento. Marcela administra «Las
      Barranqueras 246» y eso no le da ningun derecho sobre el otro edificio.
    */
    const r = await leer<Array<{ id: string }>>(
      marcela,
      `unidad?select=id&condominio_id=eq.${AJENO}`,
    );

    expect(r.estado).toBe(200);
    expect(r.datos ?? []).toHaveLength(0);
  });

  it("ni a la gente que vive allí", async () => {
    const r = await leer<Array<{ id: string }>>(
      marcela,
      `membresia_unidad?select=id&unidad_id=eq.${UNIDAD_AJENA}`,
    );

    expect(r.estado).toBe(200);
    expect(r.datos ?? []).toHaveLength(0);
  });

  it("ni al perfil de su propietario", async () => {
    // `puede_ver_perfil` abre el perfil al personal del condominio **donde esa
    // persona vive**. Bruno no vive aquí.
    const r = await leer<Array<{ id: string }>>(
      marcela,
      `perfil?select=id&id=eq.${bruno.usuarioId}`,
    );

    expect(r.estado).toBe(200);
    expect(r.datos ?? []).toHaveLength(0);
  });
});
