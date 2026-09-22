import { beforeAll, describe, expect, it } from "vitest";
import {
  CONDOMINIO,
  CUENTA,
  api,
  entrar,
  fueRechazada,
  insertar,
  leer,
  rpc,
  type Sesion,
} from "./apoyo";

/**
 * El voto es secreto.
 *
 * Es la promesa más delicada del producto: quien vota tiene que poder votar en
 * contra de la administración sin que la administración lo sepa. Y hasta ahora
 * no había **nada** que impidiera que una migración la rompiera en silencio;
 * se había comprobado a mano una vez, que es una foto y no una red.
 *
 * La promesa se sostiene sobre tres piezas, y cada una se prueba aquí:
 *
 *  1. `voto_propio_lectura` deja ver **solo el propio**. Ni un vecino ni la
 *     administración leen la tabla.
 *  2. `resultados_publicacion` devuelve recuentos y nada más.
 *  3. `detalle_votacion` devuelve el detalle nominal, pero solo a la
 *     administración y solo si la publicación **no** se creó con
 *     `ocultar_resultados`.
 *
 * Los casos negativos piden el dato prohibido explícitamente y llevan al lado
 * un control positivo: sin eso, "no veo nada" pasaría igual con la política
 * abierta si resultara que no hay votos que ver (`AGENTS.md`, regla 10).
 */

/** Las encuestas sembradas. La última esconde el detalle a propósito. */
const ENCUESTA = {
  ascensor: "0a37bab8-bbd5-488c-b4ec-5be7d67dc6f7",
  porton: "b4bf7737-6113-4c22-94f3-a57d1d9351da",
  /** `ocultar_resultados = true`: ni la administración ve quién votó qué. */
  cuota: "d0957b99-3a2a-4a7a-8c2a-6aba4ff0107b",
} as const;

const PREFIJO = "[prueba votacion]";

/** Crea una publicación de prueba y devuelve su id y el de su primera opción. */
async function crearEncuesta(
  marcela: Sesion,
  titulo: string,
  campos: Record<string, unknown>,
) {
  const publicacion = await insertar(marcela, "publicacion?select=id", {
    condominio_id: CONDOMINIO,
    categoria: "administracion",
    titulo: `${PREFIJO} ${titulo}`,
    tipo: "encuesta",
    creada_por: marcela.usuarioId,
    ...campos,
  });
  expect(publicacion.estado).toBe(201);
  const publicacionId = publicacion.datos[0].id;

  const opciones = await insertar(marcela, "opcion_voto?select=id", [
    { publicacion_id: publicacionId, etiqueta: "Sí", orden: 1 },
    { publicacion_id: publicacionId, etiqueta: "No", orden: 2 },
  ]);
  expect(opciones.estado).toBe(201);

  return {
    publicacionId,
    opciones: opciones.datos.map((o: any) => o.id) as string[],
  };
}

beforeAll(async () => {
  // Las publicaciones de prueba se recrean en cada corrida. La administración
  // es la única que puede borrarlas, que es justo lo que se quiere.
  const marcela = await entrar(CUENTA.admin);
  await api(
    marcela,
    `/rest/v1/publicacion?titulo=like.${encodeURIComponent(`${PREFIJO}%`)}`,
    { metodo: "DELETE" },
  );
});

describe("nadie lee el voto ajeno", () => {
  it("un vecino no ve el voto de otro, aunque lo pida por su nombre", async () => {
    const sofia = await entrar(CUENTA.vecino);
    const guillermo = await entrar(CUENTA.propietario);

    // Control positivo: Sofía tiene votos y los ve.
    const suyos = await leer(sofia, "voto?select=id,opcion_id");
    expect(suyos.datos.length).toBeGreaterThan(0);

    // Guillermo pide explícitamente los de Sofía. No es "no veo nada": es
    // "pido los tuyos y no llegan".
    const deSofia = await leer(
      guillermo,
      `voto?select=id&usuario_id=eq.${sofia.usuarioId}`,
    );
    expect(deSofia.datos).toHaveLength(0);

    // Y todo lo que ve es suyo.
    const todos = await leer(guillermo, "voto?select=usuario_id");
    for (const fila of todos.datos) {
      expect(fila.usuario_id).toBe(guillermo.usuarioId);
    }
  });

  it("la administración tampoco lee la tabla de votos", async () => {
    const marcela = await entrar(CUENTA.admin);
    const sofia = await entrar(CUENTA.vecino);

    // Es lo que distingue a este producto: administrar el edificio no da
    // acceso a lo que votó cada quien.
    const deSofia = await leer(
      marcela,
      `voto?select=id&usuario_id=eq.${sofia.usuarioId}`,
    );
    expect(deSofia.datos).toHaveLength(0);

    const todos = await leer(marcela, "voto?select=usuario_id");
    for (const fila of todos.datos) {
      expect(fila.usuario_id).toBe(marcela.usuarioId);
    }
    // Control positivo: Sofía sí tiene votos, así que había algo que ocultar.
    expect((await leer(sofia, "voto?select=id")).datos.length).toBeGreaterThan(0);
  });

  it("nadie puede cambiar ni borrar el voto de otro", async () => {
    const sofia = await entrar(CUENTA.vecino);
    const guillermo = await entrar(CUENTA.propietario);
    const marcela = await entrar(CUENTA.admin);

    /**
     * El voto que se intenta destruir es uno creado aquí, no uno de los
     * sembrados. La primera versión de este caso apuntaba a un voto del
     * conjunto de prueba, y al relajar la política para comprobar que el caso
     * falla —como debe— el borrado se ejecutó de verdad y se llevó ese dato
     * por delante. Una prueba no puede depender de datos que ella misma
     * destruye cuando se la pone a prueba.
     */
    const { publicacionId, opciones } = await crearEncuesta(
      marcela,
      "borrado ajeno",
      {},
    );

    const emitido = await insertar(sofia, "voto?select=id", {
      publicacion_id: publicacionId,
      opcion_id: opciones[0],
      usuario_id: sofia.usuarioId,
    });
    expect(emitido.estado).toBe(201);
    const votoId = emitido.datos[0].id;

    // La política de escritura filtra por `usuario_id`, así que el borrado no
    // da error: simplemente no alcanza a ninguna fila.
    await api(guillermo, `/rest/v1/voto?id=eq.${votoId}`, { metodo: "DELETE" });
    expect(
      (await leer(sofia, `voto?select=id&id=eq.${votoId}`)).datos,
    ).toHaveLength(1);

    // Cambiarlo de opción, tampoco.
    await api(guillermo, `/rest/v1/voto?id=eq.${votoId}`, {
      metodo: "PATCH",
      cuerpo: { opcion_id: opciones[1] },
    });
    const despues = await leer(sofia, `voto?select=opcion_id&id=eq.${votoId}`);
    expect(despues.datos[0].opcion_id).toBe(opciones[0]);
  });
});

describe("los recuentos salen, los nombres no", () => {
  it("cualquier miembro ve el recuento, y el recuento no dice quién", async () => {
    const guillermo = await entrar(CUENTA.propietario);

    const resultados = await rpc(guillermo, "resultados_publicacion", {
      p_publicacion_id: ENCUESTA.ascensor,
    });
    expect(resultados.estado).toBe(200);
    expect(resultados.datos.length).toBeGreaterThan(0);

    // Las tres columnas son opción, etiqueta y número. Ninguna es una persona.
    expect(Object.keys(resultados.datos[0]).sort()).toEqual([
      "etiqueta",
      "opcion_id",
      "votos",
    ]);

    const total = resultados.datos.reduce(
      (suma: number, fila: any) => suma + Number(fila.votos),
      0,
    );
    expect(total).toBeGreaterThan(0);
  });

  it("el detalle nominal no responde a quien no administra", async () => {
    const guillermo = await entrar(CUENTA.propietario);
    const marcela = await entrar(CUENTA.admin);

    const comoVecino = await rpc(guillermo, "detalle_votacion", {
      p_publicacion_id: ENCUESTA.ascensor,
    });
    expect(comoVecino.datos ?? []).toHaveLength(0);

    // Control positivo: esa votación tiene detalle y la administración lo ve.
    const comoAdmin = await rpc(marcela, "detalle_votacion", {
      p_publicacion_id: ENCUESTA.ascensor,
    });
    expect(comoAdmin.datos.length).toBeGreaterThan(0);
    expect(comoAdmin.datos[0].votante).toBeTruthy();
  });

  it("la portería no ve ni el detalle ni los votos", async () => {
    const roberto = await entrar(CUENTA.guardia);

    expect((await rpc(roberto, "detalle_votacion", {
      p_publicacion_id: ENCUESTA.ascensor,
    })).datos ?? []).toHaveLength(0);

    const votos = await leer(roberto, "voto?select=usuario_id");
    for (const fila of votos.datos) {
      expect(fila.usuario_id).toBe(roberto.usuarioId);
    }
  });
});

describe("una votación secreta lo es incluso para la administración", () => {
  /**
   * `ocultar_resultados` es la diferencia entre "la administración puede ver
   * quién votó qué" y "nadie puede". Es la casilla que hace secreta una
   * votación sobre, por ejemplo, subir la cuota.
   */

  it("con ocultar_resultados, el detalle no sale ni para la administración", async () => {
    const marcela = await entrar(CUENTA.admin);

    const secreta = await rpc(marcela, "detalle_votacion", {
      p_publicacion_id: ENCUESTA.cuota,
    });
    expect(secreta.datos ?? []).toHaveLength(0);

    // Control positivo doble. Primero: esa votación TIENE votos, así que el
    // vacío no es porque no haya nada.
    const recuento = await rpc(marcela, "resultados_publicacion", {
      p_publicacion_id: ENCUESTA.cuota,
    });
    const total = recuento.datos.reduce(
      (suma: number, fila: any) => suma + Number(fila.votos),
      0,
    );
    expect(total).toBeGreaterThan(0);

    // Segundo: la misma administración, la misma función, otra votación sin
    // la bandera, sí devuelve nombres. Lo único que cambia es la casilla.
    const abierta = await rpc(marcela, "detalle_votacion", {
      p_publicacion_id: ENCUESTA.porton,
    });
    expect(abierta.datos.length).toBeGreaterThan(0);
  });

  it("el recuento sí sale: lo secreto es quién votó, no cuántos", async () => {
    const guillermo = await entrar(CUENTA.propietario);

    const recuento = await rpc(guillermo, "resultados_publicacion", {
      p_publicacion_id: ENCUESTA.cuota,
    });
    expect(recuento.estado).toBe(200);
    expect(recuento.datos.length).toBeGreaterThan(0);
  });
});

describe("integridad del voto", () => {
  it("nadie vota en nombre de otro", async () => {
    const guillermo = await entrar(CUENTA.propietario);
    const sofia = await entrar(CUENTA.vecino);
    const marcela = await entrar(CUENTA.admin);

    const { publicacionId, opciones } = await crearEncuesta(
      marcela,
      "firma ajena",
      {},
    );

    const suplantado = await insertar(guillermo, "voto", {
      publicacion_id: publicacionId,
      opcion_id: opciones[0],
      usuario_id: sofia.usuarioId,
    });
    expect(fueRechazada(suplantado)).toBe(true);

    // Control positivo: firmando con lo suyo, entra.
    const propio = await insertar(guillermo, "voto", {
      publicacion_id: publicacionId,
      opcion_id: opciones[0],
      usuario_id: guillermo.usuarioId,
    });
    expect(propio.estado).toBe(201);
  });

  it("una encuesta de opción única admite un solo voto por persona", async () => {
    const guillermo = await entrar(CUENTA.propietario);
    const marcela = await entrar(CUENTA.admin);

    const { publicacionId, opciones } = await crearEncuesta(
      marcela,
      "opcion unica",
      { voto_multiple: false },
    );

    const primero = await insertar(guillermo, "voto", {
      publicacion_id: publicacionId,
      opcion_id: opciones[0],
      usuario_id: guillermo.usuarioId,
    });
    expect(primero.estado).toBe(201);

    // La segunda opción, que es la trampa: el índice único es por opción, así
    // que sin el disparador `validar_voto_unico` esto entraría y falsearía el
    // recuento.
    const segundo = await insertar(guillermo, "voto", {
      publicacion_id: publicacionId,
      opcion_id: opciones[1],
      usuario_id: guillermo.usuarioId,
    });
    expect(fueRechazada(segundo)).toBe(true);

    const recuento = await rpc(guillermo, "resultados_publicacion", {
      p_publicacion_id: publicacionId,
    });
    const total = recuento.datos.reduce(
      (suma: number, fila: any) => suma + Number(fila.votos),
      0,
    );
    expect(total).toBe(1);
  });

  it("una encuesta de opción múltiple sí admite varias", async () => {
    const guillermo = await entrar(CUENTA.propietario);
    const marcela = await entrar(CUENTA.admin);

    const { publicacionId, opciones } = await crearEncuesta(
      marcela,
      "opcion multiple",
      { voto_multiple: true },
    );

    for (const opcion of opciones) {
      const voto = await insertar(guillermo, "voto", {
        publicacion_id: publicacionId,
        opcion_id: opcion,
        usuario_id: guillermo.usuarioId,
      });
      expect(voto.estado).toBe(201);
    }
  });

  it("no se vota en una encuesta cerrada", async () => {
    const guillermo = await entrar(CUENTA.propietario);
    const marcela = await entrar(CUENTA.admin);

    // `publicacion_vigencia` exige `publicada_hasta > publicada_desde`, así
    // que para tener una encuesta ya cerrada hay que mover también el inicio.
    const { publicacionId, opciones } = await crearEncuesta(
      marcela,
      "cerrada",
      {
        publicada_desde: "2020-01-01T00:00:00Z",
        publicada_hasta: "2020-02-01T00:00:00Z",
      },
    );

    const tarde = await insertar(guillermo, "voto", {
      publicacion_id: publicacionId,
      opcion_id: opciones[0],
      usuario_id: guillermo.usuarioId,
    });
    expect(fueRechazada(tarde)).toBe(true);
  });

  it("no se vota en un anuncio, que no es una encuesta", async () => {
    const guillermo = await entrar(CUENTA.propietario);
    const marcela = await entrar(CUENTA.admin);

    // Un anuncio no tiene opciones, así que se le cuelga una a mano para
    // poder intentar el voto: si el `with check` no mirara el tipo, entraría.
    const anuncio = await insertar(marcela, "publicacion?select=id", {
      condominio_id: CONDOMINIO,
      categoria: "administracion",
      titulo: `${PREFIJO} anuncio`,
      tipo: "anuncio",
      creada_por: marcela.usuarioId,
    });
    const opcion = await insertar(marcela, "opcion_voto?select=id", {
      publicacion_id: anuncio.datos[0].id,
      etiqueta: "Sí",
      orden: 1,
    });

    const voto = await insertar(guillermo, "voto", {
      publicacion_id: anuncio.datos[0].id,
      opcion_id: opcion.datos[0].id,
      usuario_id: guillermo.usuarioId,
    });
    expect(fueRechazada(voto)).toBe(true);
  });

  it("un huésped no vota: está de paso, no es vecino", async () => {
    const tomas = await entrar(CUENTA.huesped);
    const marcela = await entrar(CUENTA.admin);

    const { publicacionId, opciones } = await crearEncuesta(
      marcela,
      "huesped",
      {},
    );

    const voto = await insertar(tomas, "voto", {
      publicacion_id: publicacionId,
      opcion_id: opciones[0],
      usuario_id: tomas.usuarioId,
    });
    expect(fueRechazada(voto)).toBe(true);
  });

  it("solo la administración crea votaciones", async () => {
    const guillermo = await entrar(CUENTA.propietario);

    const intento = await insertar(guillermo, "publicacion", {
      condominio_id: CONDOMINIO,
      categoria: "administracion",
      titulo: `${PREFIJO} de un vecino`,
      tipo: "encuesta",
      creada_por: guillermo.usuarioId,
    });
    expect(fueRechazada(intento)).toBe(true);
  });
});
