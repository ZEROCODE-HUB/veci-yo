import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  CLAVE_SERVICIO,
  CUENTA,
  URL,
  UNIDAD,
  entrar,
  rpc,
  type Sesion,
} from "./apoyo";

/**
 * El equipamiento de la renta corta: lo declara el anfitrión, lo confirma el
 * edificio.
 *
 * Hasta el 07/10/2026 las tres casillas --antirruido, no fumar, sensor-- las
 * encendía el anfitrión y se enseñaban como comprobadas, con el comentario de
 * la base afirmando que «lo confirma la administración al verificar». Las dos
 * columnas que respaldarían eso no las escribía nadie (REVISAR-A-OJO 174).
 *
 * Lo que se comprueba aquí son las tres piezas de la decisión del cliente:
 *
 *   1. **solo la administración verifica.** El anfitrión es el interesado, así
 *      que el límite tiene que estar en la base y no en que la pantalla le
 *      esconda el botón: `verificar_equipamiento` es un RPC, y un RPC es
 *      público --cualquiera lo llama sin pasar por la pantalla--;
 *   2. **la constancia lleva nombre y fecha**, y sale por donde la lee la
 *      aplicación, que es `unidades_renta_corta`;
 *   3. **y caduca en cuanto el anfitrión cambia lo verificado.** Sin esto la
 *      distinción no vale nada: la administración sube, comprueba que hay
 *      sensor, confirma; el anfitrión enciende después las otras dos, y las
 *      tres salen verificadas con la fecha de la visita en que solo se miró
 *      una.
 *
 * Cada caso negativo va con su positivo al lado: que el anfitrión no pueda no
 * prueba nada si resulta que tampoco puede nadie.
 */

let marcela: Sesion; // administradora del condominio
let sofia: Sesion; // anfitriona de la 102, la interesada
let guillermo: Sesion; // propietario de otras viviendas del mismo edificio
let renata: Sesion; // administradora de OTRO condominio

interface Fila {
  /**
   * Está aquí y no en el asunto de la prueba porque un caso la escribe, y una
   * restauración que no la devolviera dejaría «[prueba] da igual lo que diga»
   * a la vista del cliente en la ficha de la 102. Ya pasó tres veces con esta
   * misma tabla.
   */
  descripcion: string | null;
  tiene_antirruido: boolean;
  tiene_no_fumar: boolean;
  tiene_sensor: boolean;
  verificada_en: string | null;
  verificada_por: string | null;
}

/**
 * La fila entera, no solo lo que este archivo piensa tocar.
 *
 * El disparador borra dos columnas que esta prueba no escribe directamente, y
 * ya pasó una vez que un recorrido guardara «solo la fila que miraba» y dejara
 * pagadas viviendas que no lo estaban.
 */
let original: Fila | null = null;

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

const CAMPOS =
  "descripcion,tiene_antirruido,tiene_no_fumar,tiene_sensor,verificada_en,verificada_por";

/** La fila cruda. Con la clave de servicio: es la foto previa, no el asunto. */
async function filaCruda(): Promise<Fila> {
  const r = await servicio(
    `suscripcion_renta_corta?select=${CAMPOS}&unidad_id=eq.${UNIDAD.u102}`,
  );
  const filas = (await r.json()) as Fila[];
  return filas[0];
}

/** Lo que de verdad lee la aplicación. */
async function comoLoVeLaLista(sesion: Sesion) {
  const r = await rpc<
    {
      unidad_id: string;
      tiene_antirruido: boolean;
      verificada_en: string | null;
      verificada_por_nombre: string | null;
    }[]
  >(sesion, "unidades_renta_corta", {
    p_condominio_id: "11111111-1111-1111-1111-111111111111",
    p_como_personal: true,
  });
  return (r.datos ?? []).find((f) => f.unidad_id === UNIDAD.u102);
}

/**
 * Enciende o apaga una casilla.
 *
 * Con la clave de servicio y no con la sesión de Sofía a propósito: lo que
 * este caso comprueba es **el disparador**, al que le da igual quién escriba,
 * y pasar por `guardar_alojamiento` metería sus veintidós campos en medio. El
 * límite de quién puede verificar se comprueba arriba, con sesiones de verdad.
 */
async function elAnfitrionDeclara(valor: boolean) {
  await servicio(`suscripcion_renta_corta?unidad_id=eq.${UNIDAD.u102}`, {
    method: "PATCH",
    body: JSON.stringify({ tiene_sensor: valor }),
  });
}

beforeAll(async () => {
  [marcela, sofia, guillermo, renata] = await Promise.all([
    entrar(CUENTA.admin),
    entrar(CUENTA.vecino),
    entrar(CUENTA.propietario),
    entrar(CUENTA.adminAjeno),
  ]);

  original = await filaCruda();
  expect(original, "la 102 tiene que tener renta corta configurada").toBeTruthy();

  /*
    El propio cero. Una corrida anterior que muriera a mitad deja la vivienda
    verificada, y entonces «empieza sin verificar» se cumpliría por accidente.
  */
  await servicio(`suscripcion_renta_corta?unidad_id=eq.${UNIDAD.u102}`, {
    method: "PATCH",
    body: JSON.stringify({ verificada_en: null, verificada_por: null }),
  });
});

afterAll(async () => {
  if (!original) return;
  await servicio(`suscripcion_renta_corta?unidad_id=eq.${UNIDAD.u102}`, {
    method: "PATCH",
    body: JSON.stringify(original),
  });
});

describe("quién puede verificar el equipamiento", () => {
  it("el anfitrión no puede verificar lo suyo", async () => {
    const r = await rpc(sofia, "verificar_equipamiento", {
      p_unidad_id: UNIDAD.u102,
    });

    // Con patrón y no un «falló» a secas: la función comprueba dos cosas
    // --que la vivienda exista y quién llama-- y sin el patrón este caso
    // pasaría igual con un uuid inventado.
    expect(r.estado).toBeGreaterThanOrEqual(400);
    expect(r.mensaje ?? "").toMatch(/administración del edificio/i);

    const fila = await filaCruda();
    expect(fila.verificada_en).toBeNull();
  });

  it("un propietario del mismo edificio tampoco", async () => {
    const r = await rpc(guillermo, "verificar_equipamiento", {
      p_unidad_id: UNIDAD.u102,
    });
    expect(r.mensaje ?? "").toMatch(/administración del edificio/i);
  });

  it("la administración de otro edificio tampoco", async () => {
    const r = await rpc(renata, "verificar_equipamiento", {
      p_unidad_id: UNIDAD.u102,
    });
    expect(r.mensaje ?? "").toMatch(/administración del edificio/i);
  });

  it("la administración del edificio sí, y queda su nombre y la fecha", async () => {
    const r = await rpc(marcela, "verificar_equipamiento", {
      p_unidad_id: UNIDAD.u102,
    });
    expect(r.estado).toBe(200);

    const fila = await filaCruda();
    expect(fila.verificada_en).toBeTruthy();
    expect(fila.verificada_por).toBe(marcela.usuarioId);

    // Y llega hasta donde lo lee la pantalla, que es lo que faltaba: la
    // columna existía desde el 22/09 y no salía de la base.
    const enLaLista = await comoLoVeLaLista(marcela);
    expect(enLaLista?.verificada_en).toBeTruthy();
    expect(enLaLista?.verificada_por_nombre ?? "").toMatch(/marcela/i);
  });

  it("y la puede retirar", async () => {
    await rpc(marcela, "verificar_equipamiento", {
      p_unidad_id: UNIDAD.u102,
      p_verificada: true,
    });
    const r = await rpc(marcela, "verificar_equipamiento", {
      p_unidad_id: UNIDAD.u102,
      p_verificada: false,
    });
    expect(r.estado).toBe(200);

    const fila = await filaCruda();
    expect(fila.verificada_en).toBeNull();
    expect(fila.verificada_por).toBeNull();
  });
});

describe("la verificación caduca cuando cambia lo verificado", () => {
  it("se borra sola si el anfitrión cambia una casilla", async () => {
    await rpc(marcela, "verificar_equipamiento", {
      p_unidad_id: UNIDAD.u102,
      p_verificada: true,
    });
    const antes = await filaCruda();
    expect(antes.verificada_en, "control: queda verificada").toBeTruthy();

    await elAnfitrionDeclara(!antes.tiene_sensor);

    const despues = await filaCruda();
    expect(despues.verificada_en).toBeNull();
    expect(despues.verificada_por).toBeNull();
  });

  it("no se borra por guardar otra cosa de la vivienda", async () => {
    /*
      El control positivo del caso anterior. Sin él, un disparador que borrase
      la verificación en **cualquier** escritura pasaría las dos pruebas, y
      entonces verificar no serviría de nada: la siguiente vez que el anfitrión
      tocara su descripción, se caería.
    */
    await rpc(marcela, "verificar_equipamiento", {
      p_unidad_id: UNIDAD.u102,
      p_verificada: true,
    });

    await servicio(`suscripcion_renta_corta?unidad_id=eq.${UNIDAD.u102}`, {
      method: "PATCH",
      body: JSON.stringify({ descripcion: "[prueba] da igual lo que diga" }),
    });

    const fila = await filaCruda();
    expect(fila.verificada_en).toBeTruthy();
  });
});
