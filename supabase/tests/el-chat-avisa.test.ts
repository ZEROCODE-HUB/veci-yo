import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  CLAVE_SERVICIO,
  CUENTA,
  MARCA_PRUEBA,
  URL,
  UNIDAD,
  api,
  entrar,
  insertar,
  leer,
  rpc,
  type Sesion,
} from "./apoyo";

/**
 * El chat avisa, y entre vecinos no se escribe.
 *
 * Dos cosas que pidió el cliente el 07/10/2026 en la misma frase. Van juntas
 * aquí porque la segunda decide a quién puede llegarle lo primero.
 *
 * ## Lo que hay que comprobar de verdad
 *
 * No que la notificación se cree --eso es fontanería-- sino **a quién no le
 * llega**:
 *
 *   · a quien escribió, que ya lo sabe;
 *   · a quien silenció esa conversación, porque si no el interruptor que el
 *     cliente pidió el 02/10 habría dejado de hacer lo que promete el mismo
 *     día que esto se enciende;
 *   · y a quien apagó el motivo en sus preferencias, que es lo que convierte
 *     esa pantalla en algo más que nueve casillas decorativas.
 *
 * Cada uno con su control positivo al lado: «no le llega» no prueba nada si
 * resulta que no le llega a nadie.
 */

let sofia: Sesion; // vecina de la 102
let guillermo: Sesion; // propietario de la 101 y la 205
let marcela: Sesion; // administradora
let tomas: Sesion; // huésped de la 102

/** El hilo de la 102 con la administración. */
let hilo: string;

const TEXTO = `${MARCA_PRUEBA} mensaje que tiene que avisar`;

interface Aviso {
  id: string;
  usuario_id: string;
  tipo: string;
  titulo: string;
  mensaje: string;
  entidad_tipo: string | null;
  entidad_id: string | null;
}

function servicio(ruta: string, opciones: RequestInit = {}) {
  return fetch(`${URL}/rest/v1/${ruta}`, {
    ...opciones,
    headers: {
      apikey: CLAVE_SERVICIO,
      Authorization: `Bearer ${CLAVE_SERVICIO}`,
      "Content-Type": "application/json",
      ...(opciones.headers ?? {}),
    },
  });
}

/** Los avisos de chat que haya ahora mismo, de los nuestros. */
async function avisosDeChat(): Promise<Aviso[]> {
  const r = await servicio(
    `notificacion?select=id,usuario_id,tipo,titulo,mensaje,entidad_tipo,entidad_id` +
      `&tipo=eq.mensaje_de_chat&mensaje=like.${encodeURIComponent("[prueba]%")}`,
  );
  return (await r.json()) as Aviso[];
}

async function escribir(sesion: Sesion, texto: string): Promise<string> {
  const r = await insertar<{ id: string }[]>(sesion, "mensaje?select=id", {
    conversacion_id: hilo,
    autor_id: sesion.usuarioId,
    autor_nombre: "[prueba]",
    texto,
  });
  expect(r.estado, JSON.stringify(r.datos)).toBe(201);
  return r.datos[0].id;
}

/**
 * Silencia o des-silencia el hilo para Marcela, **y comprueba que se escribio**.
 *
 * La primera version lo hacia con un POST y `merge-duplicates` sin decir por
 * que columnas, asi que PostgREST intentaba insertar, `participante_unico` lo
 * rechazaba con un 409, y el error se tiraba. El caso fallaba diciendo que el
 * silencio no silencia --cuando lo que pasaba es que nunca se puso--.
 *
 * Es «un `await` a algo que escribe lleva el error desestructurado», que este
 * proyecto ya tiene escrito, cometido dentro de la prueba que lo comprueba.
 */
async function silenciar(valor: boolean) {
  const r = await servicio(
    `participante_conversacion?conversacion_id=eq.${hilo}&usuario_id=eq.${marcela.usuarioId}`,
    { method: "PATCH", body: JSON.stringify({ silenciado: valor }) },
  );
  expect(r.ok, await r.text()).toBe(true);

  const comprobar = await servicio(
    `participante_conversacion?select=silenciado&conversacion_id=eq.${hilo}&usuario_id=eq.${marcela.usuarioId}`,
  );
  const filas = (await comprobar.json()) as { silenciado: boolean }[];
  expect(filas[0]?.silenciado, "el silencio tiene que haberse escrito").toBe(valor);
}

/** Deja la bandeja y los mensajes como estaban antes de cada caso. */
async function barrer() {
  await servicio(
    `notificacion?tipo=eq.mensaje_de_chat&mensaje=like.${encodeURIComponent("[prueba]%")}`,
    { method: "DELETE" },
  );
  await servicio(`mensaje?texto=like.${encodeURIComponent("[prueba]%")}`, {
    method: "DELETE",
  });
}

beforeAll(async () => {
  [sofia, marcela, tomas, guillermo] = await Promise.all([
    entrar(CUENTA.vecino),
    entrar(CUENTA.admin),
    entrar(CUENTA.huesped),
    entrar(CUENTA.propietario),
  ]);

  const hilos = await leer<{ id: string }[]>(
    sofia,
    `conversacion?select=id&tipo=eq.area&area=eq.administracion&unidad_id=eq.${UNIDAD.u102}&limit=1`,
  );

  if (hilos.datos?.length) {
    hilo = hilos.datos[0].id;
  } else {
    const creado = await insertar<{ id: string }[]>(
      sofia,
      "conversacion?select=id",
      {
        condominio_id: "11111111-1111-1111-1111-111111111111",
        tipo: "area",
        area: "administracion",
        unidad_id: UNIDAD.u102,
        creada_por: sofia.usuarioId,
      },
    );
    expect(creado.estado, JSON.stringify(creado.datos)).toBe(201);
    hilo = creado.datos[0].id;
  }

  /*
    La fila de participante de Marcela. Existe en cuanto abre la conversacion
    una vez --es donde vive la marca de leido-- pero una base recien sembrada
    no la tiene, y entonces el caso del silencio fallaria por no tener donde
    escribirlo. Se trae lo que necesita.
  */
  await servicio("participante_conversacion", {
    method: "POST",
    headers: { Prefer: "resolution=ignore-duplicates" },
    body: JSON.stringify({
      conversacion_id: hilo,
      usuario_id: marcela.usuarioId,
    }),
  });

  // El propio cero: una corrida que muera a mitad deja avisos con la marca.
  await barrer();
});

/*
  Y cada caso el suyo. Sin esto el segundo cuenta los avisos del primero, y
  «no le llega» pasa o falla segun lo que dejara el anterior: la primera
  version de este archivo fallaba exactamente asi.
*/
beforeEach(barrer);

afterAll(async () => {
  await barrer();
  /*
    Y la preferencia de Marcela, pase lo que pase. Un caso que falla a mitad
    no llega a volver a encenderla, y entonces **la deja apagada para la
    siguiente corrida** --que es como se puso rojo este archivo la primera
    vez, en un caso que no tenia nada que ver--. Es «al mutar, limpiar lo que
    se escribio», aplicado a una preferencia.

    Se borra la fila en vez de ponerla en true: sin fila, `quiere_aviso`
    devuelve el valor por defecto, que es lo que habia antes de esta prueba.
  */
  await servicio(
    `preferencia_aviso?usuario_id=eq.${marcela.usuarioId}&motivo=eq.mensaje_de_chat`,
    { method: "DELETE" },
  );
  // Y el silencio, por lo mismo: un caso que falla a mitad lo dejaria puesto.
  await servicio(
    `participante_conversacion?conversacion_id=eq.${hilo}&usuario_id=eq.${marcela.usuarioId}`,
    { method: "PATCH", body: JSON.stringify({ silenciado: false }) },
  );
});

describe("a quién avisa un mensaje", () => {
  it("avisa a la administración y no a quien escribió", async () => {
    await escribir(sofia, TEXTO);

    const avisos = await avisosDeChat();
    const quienes = avisos.map((a) => a.usuario_id);

    expect(quienes, "la administración tiene que enterarse").toContain(
      marcela.usuarioId,
    );
    expect(quienes, "quien escribió ya lo sabe").not.toContain(sofia.usuarioId);
  });

  it("y el aviso lleva de dónde viene y a dónde ir", async () => {
    await escribir(sofia, TEXTO);

    const aviso = (await avisosDeChat()).find(
      (a) => a.usuario_id === marcela.usuarioId,
    );

    expect(aviso?.titulo).toBe("Administración");
    expect(aviso?.mensaje).toBe(TEXTO);
    /*
      Sin esto el aviso dice «te escribieron» y deja a la persona buscando. La
      pantalla usa las dos cosas para abrir la conversación.
    */
    expect(aviso?.entidad_tipo).toBe("conversacion");
    expect(aviso?.entidad_id).toBe(hilo);
  });

  it("no avisa a alguien de otra vivienda", async () => {
    await escribir(sofia, TEXTO);
    const quienes = (await avisosDeChat()).map((a) => a.usuario_id);

    const guillermo = await entrar(CUENTA.propietario);
    expect(quienes).not.toContain(guillermo.usuarioId);
    // Control positivo: a alguien sí le llegó.
    expect(quienes.length).toBeGreaterThan(0);
  });
});

describe("los dos interruptores", () => {
  it("a quien silenció la conversación no le llega", async () => {
    await silenciar(true);

    await escribir(sofia, TEXTO);
    const callado = (await avisosDeChat()).map((a) => a.usuario_id);
    expect(callado).not.toContain(marcela.usuarioId);

    // Y el positivo: con el silencio quitado, el mismo mensaje sí le llega.
    await barrer();
    await silenciar(false);

    await escribir(sofia, TEXTO);
    expect((await avisosDeChat()).map((a) => a.usuario_id)).toContain(
      marcela.usuarioId,
    );
  });

  it("a quien apagó el motivo en sus preferencias, tampoco", async () => {
    const apagar = await rpc(marcela, "guardar_aviso", {
      p_motivo: "mensaje_de_chat",
      p_por_app: false,
      p_por_correo: false,
      p_por_whatsapp: false,
    });
    expect(apagar.estado).toBe(200);

    await escribir(sofia, TEXTO);
    expect((await avisosDeChat()).map((a) => a.usuario_id)).not.toContain(
      marcela.usuarioId,
    );

    // Encendido otra vez, el mismo mensaje sí llega. Sin esta mitad, la
    // casilla pasaría por buena aunque no avisara nunca a nadie.
    await barrer();
    await rpc(marcela, "guardar_aviso", {
      p_motivo: "mensaje_de_chat",
      p_por_app: true,
      p_por_correo: false,
      p_por_whatsapp: false,
    });

    await escribir(sofia, TEXTO);
    expect((await avisosDeChat()).map((a) => a.usuario_id)).toContain(
      marcela.usuarioId,
    );
  });
});

describe("entre vecinos no se escribe", () => {
  /*
    Con `return=minimal`, y esto costo entenderlo.
    ----------------------------------------------
    La primera version usaba el atajo de siempre --que pide
    `return=representation`-- y los tres casos pasaban **con la politica
    abierta de par en par**. O sea que no median nada.

    El motivo es el que este proyecto ya tiene escrito para el borrado logico
    de un mensaje, por el otro lado: Postgres aplica las politicas de SELECT
    sobre la fila nueva cuando la sentencia lleva `returning`, y PostgREST lo
    lleva siempre que se le pide la fila de vuelta. Para una conversacion
    `directa`, `puede_ver_conversacion_fila` exige una fila de participante que
    **todavia no existe al crearla**, asi que el insert se rechaza a si mismo
    con el mismo 42501 que daria un permiso denegado.

    Dicho de otro modo: una conversacion directa era imposible de crear por
    accidente, no por decision. Ahora lo es por decision, y estos casos lo
    comprueban porque `return=minimal` quita el `returning` y deja sola a la
    politica de alta.

    Comprobado abriendo la politica a mano: con `representation` sigue dando
    403 y con `minimal` responde 201.
  */
  const abrirDirecta = (quien: Sesion) =>
    api(quien, "/rest/v1/conversacion", {
      metodo: "POST",
      prefer: "return=minimal",
      cuerpo: {
        condominio_id: "11111111-1111-1111-1111-111111111111",
        tipo: "directa",
        creada_por: quien.usuarioId,
      },
    });

  it("un residente no puede abrir una conversación directa", async () => {
    const intento = await abrirDirecta(sofia);
    expect(intento.estado).toBe(403);
  });

  it("ni la administración, ni un huésped", async () => {
    for (const quien of [marcela, tomas]) {
      expect((await abrirDirecta(quien)).estado).toBe(403);
    }
  });

  it("pero un hilo con la portería se sigue abriendo", async () => {
    /*
      El control positivo, y no es decorativo: una política que rechazara
      **todo** pasaría los dos casos de arriba y dejaría al vecino sin poder
      hablar con nadie, que es lo contrario de lo que se pidió.

      Con la 205 de Guillermo y no con la 102: `conversacion_area_unica` impide
      dos hilos de la misma área para la misma vivienda, y la 102 ya tiene los
      dos. Elegir «la que sea» habría dado un 409 que no dice nada del permiso.

      Se crea y se retira con la clave de servicio: `conversacion` no tiene
      política de DELETE, es constancia de un hilo.
    */
    const r = await insertar<{ id: string }[]>(
      guillermo,
      "conversacion?select=id",
      {
        condominio_id: "11111111-1111-1111-1111-111111111111",
        tipo: "area",
        area: "seguridad",
        unidad_id: UNIDAD.u205,
        creada_por: guillermo.usuarioId,
      },
    );

    expect(r.estado, JSON.stringify(r.datos)).toBe(201);
    await servicio(`conversacion?id=eq.${r.datos[0].id}`, { method: "DELETE" });
  });
});
