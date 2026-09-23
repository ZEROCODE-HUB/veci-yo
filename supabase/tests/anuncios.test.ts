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
 * Anuncios: a quién llega cada uno.
 *
 * `publicacion` tiene tres casillas de audiencia que el formulario ofrece
 * marcar, y hasta 20260922203000 **ninguna servía para nada**: la política era
 * `es_miembro_condominio` a secas, así que un anuncio dirigido "solo a
 * propietarios" lo leía cualquier residente —y no solo en la pantalla: salía
 * en la respuesta de la API—. Lo único que filtraba era el cliente, y solo
 * para el huésped; `para_huespedes` era directamente una casilla muerta,
 * porque el huésped no entra en `es_miembro_condominio`.
 *
 * El reparto de las cuentas de prueba es lo que hace comprobable esto:
 *
 * | quién     | propietario | reside | huésped |
 * |-----------|-------------|--------|---------|
 * | Guillermo | sí (101/205)| sí     | no      |
 * | Laura     | **no**      | sí (205)| sí (102)|
 * | Tomás     | no          | no     | sí (102)|
 * | Ramiro    | no          | no     | estancia terminada |
 *
 * Laura es la pieza clave: vive en el edificio sin ser dueña de nada, así que
 * distingue "residentes" de "propietarios", que es justo lo que antes no se
 * distinguía.
 */

const PREFIJO = "[prueba anuncios]";

async function publicar(
  marcela: Sesion,
  titulo: string,
  audiencia: {
    para_propietarios: boolean;
    para_residentes: boolean;
    para_huespedes: boolean;
  },
  campos: Record<string, unknown> = {},
) {
  const alta = await insertar(marcela, "publicacion?select=id", {
    condominio_id: CONDOMINIO,
    categoria: "administracion",
    titulo: `${PREFIJO} ${titulo}`,
    tipo: "anuncio",
    creada_por: marcela.usuarioId,
    ...audiencia,
    ...campos,
  });
  expect(alta.estado).toBe(201);
  return alta.datos[0].id as string;
}

/** Quién, de entre estas sesiones, ve una publicación concreta. */
async function loVen(sesiones: Sesion[], publicacionId: string) {
  const quienes: string[] = [];
  for (const sesion of sesiones) {
    const vista = await leer(
      sesion,
      `publicacion?select=id&id=eq.${publicacionId}`,
    );
    if (vista.datos.length > 0) quienes.push(sesion.correo);
  }
  return quienes;
}

beforeAll(async () => {
  const marcela = await entrar(CUENTA.admin);
  await api(
    marcela,
    `/rest/v1/publicacion?titulo=like.${encodeURIComponent(`${PREFIJO}%`)}`,
    { metodo: "DELETE" },
  );
});

describe("cada quien ve lo que va dirigido a él", () => {
  it("un anuncio solo para propietarios no lo ve quien no lo es", async () => {
    const marcela = await entrar(CUENTA.admin);
    const guillermo = await entrar(CUENTA.propietario);
    const laura = await entrar(CUENTA.laura);

    const anuncio = await publicar(marcela, "solo propietarios", {
      para_propietarios: true,
      para_residentes: false,
      para_huespedes: false,
    });

    // Laura vive en el edificio pero no es dueña de nada. Control positivo y
    // negativo en la misma llamada.
    expect(await loVen([guillermo, laura], anuncio)).toEqual([guillermo.correo]);
  });

  it("un anuncio solo para residentes lo ve el inquilino, no el dueño ausente", async () => {
    const marcela = await entrar(CUENTA.admin);
    const laura = await entrar(CUENTA.laura);
    const tomas = await entrar(CUENTA.huesped);

    const anuncio = await publicar(marcela, "solo residentes", {
      para_propietarios: false,
      para_residentes: true,
      para_huespedes: false,
    });

    expect(await loVen([laura, tomas], anuncio)).toEqual([laura.correo]);
  });

  it("`para_huespedes` deja de ser una casilla muerta", async () => {
    const marcela = await entrar(CUENTA.admin);
    const tomas = await entrar(CUENTA.huesped);
    const ramiro = await entrar(CUENTA.huespedVencido);
    const guillermo = await entrar(CUENTA.propietario);

    const anuncio = await publicar(marcela, "corte de agua", {
      para_propietarios: false,
      para_residentes: false,
      para_huespedes: true,
    });

    // Al huésped alojado sí —el corte de agua le afecta igual que a todos—,
    // al que ya se fue no, y a quien no es su audiencia tampoco.
    expect(await loVen([tomas, ramiro, guillermo], anuncio)).toEqual([
      tomas.correo,
    ]);
  });

  it("la administración y la portería ven el tablón entero", async () => {
    const marcela = await entrar(CUENTA.admin);
    const roberto = await entrar(CUENTA.guardia);

    // Sin ninguna casilla marcada: no va dirigido a nadie en particular.
    const anuncio = await publicar(marcela, "sin audiencia", {
      para_propietarios: false,
      para_residentes: false,
      para_huespedes: false,
    });

    expect(await loVen([marcela, roberto], anuncio)).toEqual([
      marcela.correo,
      roberto.correo,
    ]);

    // Y ese mismo, que no va dirigido a nadie, no lo ve ningún vecino.
    const guillermo = await entrar(CUENTA.propietario);
    const laura = await entrar(CUENTA.laura);
    expect(await loVen([guillermo, laura], anuncio)).toEqual([]);
  });
});

describe("el voto sigue a la publicación", () => {
  it("una encuesta de propietarios no acepta el voto de quien no lo es", async () => {
    const marcela = await entrar(CUENTA.admin);
    const guillermo = await entrar(CUENTA.propietario);
    const laura = await entrar(CUENTA.laura);

    const encuesta = await publicar(
      marcela,
      "solo dueños votan",
      {
        para_propietarios: true,
        para_residentes: false,
        para_huespedes: false,
      },
      { tipo: "encuesta" },
    );

    const opciones = await insertar(marcela, "opcion_voto?select=id", [
      { publicacion_id: encuesta, etiqueta: "Sí", orden: 1 },
      { publicacion_id: encuesta, etiqueta: "No", orden: 2 },
    ]);
    const opcionId = opciones.datos[0].id;

    // Laura no ve la encuesta, así que tampoco puede votarla. Antes el
    // `with check` solo miraba `es_miembro_condominio`.
    const deLaura = await insertar(laura, "voto", {
      publicacion_id: encuesta,
      opcion_id: opcionId,
      usuario_id: laura.usuarioId,
    });
    expect(fueRechazada(deLaura)).toBe(true);

    // Control positivo: Guillermo sí es propietario y su voto entra.
    const deGuillermo = await insertar(guillermo, "voto", {
      publicacion_id: encuesta,
      opcion_id: opcionId,
      usuario_id: guillermo.usuarioId,
    });
    expect(deGuillermo.estado).toBe(201);
  });

  it("quien no ve la encuesta tampoco ve sus opciones ni su recuento", async () => {
    const marcela = await entrar(CUENTA.admin);
    const guillermo = await entrar(CUENTA.propietario);
    const laura = await entrar(CUENTA.laura);

    const encuesta = await publicar(
      marcela,
      "recuento reservado",
      {
        para_propietarios: true,
        para_residentes: false,
        para_huespedes: false,
      },
      { tipo: "encuesta" },
    );
    await insertar(marcela, "opcion_voto", {
      publicacion_id: encuesta,
      etiqueta: "Sí",
      orden: 1,
    });

    const opcionesDeLaura = await leer(
      laura,
      `opcion_voto?select=id&publicacion_id=eq.${encuesta}`,
    );
    expect(opcionesDeLaura.datos).toHaveLength(0);

    const recuentoDeLaura = await rpc(laura, "resultados_publicacion", {
      p_publicacion_id: encuesta,
    });
    expect(recuentoDeLaura.datos ?? []).toHaveLength(0);

    // Control positivo: para un propietario, ambas cosas salen.
    const opcionesDeGuillermo = await leer(
      guillermo,
      `opcion_voto?select=id&publicacion_id=eq.${encuesta}`,
    );
    expect(opcionesDeGuillermo.datos).toHaveLength(1);
    const recuento = await rpc(guillermo, "resultados_publicacion", {
      p_publicacion_id: encuesta,
    });
    expect(recuento.datos).toHaveLength(1);
  });

  it("un huésped no vota, aunque la encuesta vaya dirigida a huéspedes", async () => {
    const marcela = await entrar(CUENTA.admin);
    const tomas = await entrar(CUENTA.huesped);

    const encuesta = await publicar(
      marcela,
      "encuesta para huespedes",
      {
        para_propietarios: false,
        para_residentes: false,
        para_huespedes: true,
      },
      { tipo: "encuesta" },
    );
    const opcion = await insertar(marcela, "opcion_voto?select=id", {
      publicacion_id: encuesta,
      etiqueta: "Sí",
      orden: 1,
    });

    // La ve —va dirigida a él— pero no la vota: está de paso.
    expect(await loVen([tomas], encuesta)).toEqual([tomas.correo]);

    const voto = await insertar(tomas, "voto", {
      publicacion_id: encuesta,
      opcion_id: opcion.datos[0].id,
      usuario_id: tomas.usuarioId,
    });
    expect(fueRechazada(voto)).toBe(true);
  });
});
