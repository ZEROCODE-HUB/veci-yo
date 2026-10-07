import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  CLAVE_SERVICIO,
  CUENTA,
  MARCA_PRUEBA,
  URL,
  entrar,
  insertar,
  leer,
  rpc,
  type Sesion,
} from "./apoyo";

/**
 * Un mensaje retirado deja lápida, y su texto no vuelve a salir.
 *
 * Lo decidió el cliente el 07/10/2026 (REVISAR-A-OJO 137). Hasta entonces un
 * mensaje retirado **desaparecía sin dejar hueco**: la conversación perdía
 * mensajes en silencio y después se discutía sobre lo que se dijo.
 *
 * Lo que de verdad hay que comprobar aquí no es la lápida --eso se ve-- sino
 * **lo que no se ve**: el texto. La salida fácil era quitarle el
 * `deleted_at is null` a `mensaje_lectura`, y con eso cualquiera de la
 * conversación podría pedir la tabla por PostgREST y leer exactamente lo que
 * la administración acaba de retirar. La moderación quedaría en un adorno de
 * la pantalla, que es el defecto más repetido de este proyecto con un agujero
 * de privacidad dentro.
 *
 * Por eso cada caso tiene **dos mitades**: lo que la función devuelve y lo que
 * la tabla sigue sin devolver.
 *
 * Y de camino, algo que este archivo encontró y no venía a buscar:
 * `20261005160000` estaba **registrada como aplicada** y le faltaban cuatro
 * objetos, entre ellos `retirar_mensaje`. O sea que nadie podía retirar nada,
 * ni su propio mensaje, mientras el repositorio afirmaba que sí. Lo cuenta
 * ahora `npm run objetos`.
 */

let sofia: Sesion; // vecina de la 102
let marcela: Sesion; // administradora: modera los canales
let tomas: Sesion; // huésped de la 102, no entra en el canal de residentes

/** El canal de residentes del edificio, que es donde hay moderación. */
let canal: string;

/** Lo que crea este archivo, para llevárselo. */
const mensajes: string[] = [];

const TEXTO_MODERADO = `${MARCA_PRUEBA} esto lo retira la administracion`;
const TEXTO_PROPIO = `${MARCA_PRUEBA} esto lo retiro yo mismo`;
const TEXTO_INTACTO = `${MARCA_PRUEBA} esto se queda publicado`;

interface Lapida {
  id: string;
  texto: string | null;
  retirado_por: string | null;
}

/** `mensaje` no tiene política de DELETE: la limpieza va con la clave. */
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

const hilo = (sesion: Sesion) =>
  rpc<Lapida[]>(sesion, "mensajes_de_conversacion", {
    p_conversacion_id: canal,
  });

async function escribir(sesion: Sesion, texto: string): Promise<string> {
  const r = await insertar<{ id: string }[]>(sesion, "mensaje?select=id", {
    conversacion_id: canal,
    autor_id: sesion.usuarioId,
    autor_nombre: "[prueba]",
    texto,
  });
  expect(r.estado, JSON.stringify(r.datos)).toBe(201);
  const id = r.datos[0].id;
  mensajes.push(id);
  return id;
}

beforeAll(async () => {
  [sofia, marcela, tomas] = await Promise.all([
    entrar(CUENTA.vecino),
    entrar(CUENTA.admin),
    entrar(CUENTA.huesped),
  ]);

  const canales = await leer<{ id: string }[]>(
    sofia,
    "conversacion?select=id&tipo=eq.grupo&ambito=eq.residentes&limit=1",
  );
  expect(canales.datos?.length, "hace falta el canal de residentes").toBe(1);
  canal = canales.datos[0].id;

  /*
    El propio cero. Una corrida que muera a mitad deja sus mensajes con la
    marca dentro del canal, y entonces los recuentos de abajo cuentan los de
    ayer. Se barren antes, no solo después.
  */
  await servicio(
    `mensaje?conversacion_id=eq.${canal}&texto=like.${encodeURIComponent("[prueba]%")}`,
    { method: "DELETE" },
  );
});

afterAll(async () => {
  for (const id of mensajes) {
    await servicio(`mensaje?id=eq.${id}`, { method: "DELETE" });
  }
});

describe("la lápida de un mensaje retirado", () => {
  it("la administración lo retira, y queda el hueco diciendo que fue ella", async () => {
    const id = await escribir(sofia, TEXTO_MODERADO);

    // Control positivo: antes de retirarlo, el texto está y no hay lápida.
    const antes = (await hilo(sofia)).datos.find((m) => m.id === id);
    expect(antes?.texto).toBe(TEXTO_MODERADO);
    expect(antes?.retirado_por).toBeNull();

    const quitado = await rpc(marcela, "retirar_mensaje", { p_mensaje_id: id });
    expect(quitado.estado, JSON.stringify(quitado.datos)).toBe(200);

    const despues = (await hilo(sofia)).datos.find((m) => m.id === id);
    expect(despues, "la fila tiene que seguir llegando: es el hueco").toBeTruthy();
    expect(despues?.retirado_por).toBe("administracion");
    expect(despues?.texto).toBeNull();
  });

  it("y su texto no se puede leer por la tabla", async () => {
    /*
      La mitad que importa. Si algún día alguien «arregla» esto relajando
      `mensaje_lectura`, este caso se pone rojo: la fila volvería por la tabla
      y con ella el texto que la administración acababa de retirar.
    */
    const porLaTabla = await leer<{ id: string; texto: string }[]>(
      sofia,
      `mensaje?select=id,texto&conversacion_id=eq.${canal}&texto=eq.${encodeURIComponent(TEXTO_MODERADO)}`,
    );
    expect(porLaTabla.datos).toEqual([]);

    // Y el control positivo al lado: por la tabla sí se lee lo que no se retiró.
    const publicado = await escribir(sofia, TEXTO_INTACTO);
    const vivo = await leer<{ id: string }[]>(
      sofia,
      `mensaje?select=id&id=eq.${publicado}`,
    );
    expect(vivo.datos?.length).toBe(1);
  });

  it("quien se arrepiente deja «retirado», no «retirado por la administración»", async () => {
    const id = await escribir(sofia, TEXTO_PROPIO);
    const quitado = await rpc(sofia, "retirar_mensaje", { p_mensaje_id: id });
    expect(quitado.estado).toBe(200);

    const despues = (await hilo(sofia)).datos.find((m) => m.id === id);
    expect(despues?.retirado_por).toBe("autor");
    expect(despues?.texto).toBeNull();
  });

  it("quien no está en la conversación no recibe ni las lápidas", async () => {
    /*
      `mensajes_de_conversacion` es `security definer`, o sea que las políticas
      no deciden: si la comprobación de dentro desapareciera, la función
      entregaría cualquier canal del edificio a cualquiera con sesión. Tomás es
      huésped de la 102 y el canal de residentes no lo nombra.
    */
    const suyo = await hilo(tomas);
    expect(suyo.datos).toEqual([]);

    // Control positivo: Sofía, que sí está, recibe mensajes de ese canal.
    expect((await hilo(sofia)).datos.length).toBeGreaterThan(0);
  });
});
