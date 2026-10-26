import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  CLAVE,
  CLAVE_SERVICIO,
  CONDOMINIO,
  CUENTA,
  UNIDAD,
  URL,
  api,
  descargarArchivo,
  entrar,
  insertar,
  leer,
  MARCA_PRUEBA,
  rpc,
  type Sesion,
} from "./apoyo";

/**
 * El chat admite adjuntos (hueco 8, 21/10/2026).
 *
 * El comprobante de pago de una zona se puede mandar por el chat a la
 * administración. El archivo vive en el bucket privado `chat`, en la carpeta
 * de su conversación, y lo lee y lo sube quien puede ver esa conversación: la
 * misma regla que los mensajes. Un vecino de otra vivienda no lo abre.
 */

const servicio: Sesion = { token: CLAVE_SERVICIO, usuarioId: "", correo: "" };
let guillermo: Sesion;
let sofia: Sesion;
let porteria: Sesion;
let hilo101 = "";
let hilo205 = "";
const subidos: string[] = [];
/** Los hilos que creó este archivo: se retiran al terminar (otro archivo crea el de la 205). */
const hilosCreados: string[] = [];
const mensajes: string[] = [];

/** Sube un PNG mínimo sin pisar nada (`x-upsert: false`, como la app). */
async function subir(sesion: Sesion, ruta: string) {
  const png = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const r = await fetch(`${URL}/storage/v1/object/chat/${ruta}`, {
    method: "POST",
    headers: {
      apikey: CLAVE,
      Authorization: `Bearer ${sesion.token}`,
      "Content-Type": "image/png",
      "x-upsert": "false",
    },
    body: png,
  });
  if (r.ok) subidos.push(ruta);
  return r.status;
}

async function hiloDe(sesion: Sesion, unidad: string) {
  const r = await leer(sesion, `conversacion?select=id&tipo=eq.area&area=eq.seguridad&unidad_id=eq.${unidad}`);
  if (r.datos.length) return r.datos[0].id as string;
  const creada = await insertar(sesion, "conversacion?select=id", {
    condominio_id: CONDOMINIO,
    tipo: "area",
    area: "seguridad",
    unidad_id: unidad,
    creada_por: sesion.usuarioId,
  });
  hilosCreados.push(creada.datos[0].id);
  return creada.datos[0].id as string;
}

beforeAll(async () => {
  [guillermo, sofia, porteria] = await Promise.all([
    entrar(CUENTA.propietario),
    entrar(CUENTA.vecino),
    entrar(CUENTA.guardia),
  ]);
  hilo101 = await hiloDe(guillermo, UNIDAD.u101);
  hilo205 = await hiloDe(guillermo, UNIDAD.u205);
});

afterAll(async () => {
  for (const id of mensajes) await api(servicio, `/rest/v1/mensaje?id=eq.${id}`, { metodo: "DELETE" });
  for (const id of hilosCreados) {
    await api(servicio, `/rest/v1/participante_conversacion?conversacion_id=eq.${id}`, { metodo: "DELETE" });
    await api(servicio, `/rest/v1/conversacion?id=eq.${id}`, { metodo: "DELETE" });
  }
  for (const ruta of subidos) {
    await fetch(`${URL}/storage/v1/object/chat/${ruta}`, {
      method: "DELETE",
      headers: { apikey: CLAVE, Authorization: `Bearer ${CLAVE_SERVICIO}` },
    });
  }
});

describe("subir un adjunto", () => {
  it("quien está en la conversación, sí", async () => {
    expect(await subir(guillermo, `${hilo101}/comprobante-prueba.png`)).toBe(200);
  });

  it("un vecino de otra vivienda, no", async () => {
    expect(await subir(sofia, `${hilo101}/intruso-prueba.png`)).toBeGreaterThanOrEqual(400);
  });
});

describe("leer un adjunto", () => {
  it("la portería, que atiende ese hilo, lo abre", async () => {
    const r = await descargarArchivo(porteria, "chat", `${hilo101}/comprobante-prueba.png`);
    expect(r.estado).toBe(200);
  });

  it("un vecino de otra vivienda, no", async () => {
    const r = await descargarArchivo(sofia, "chat", `${hilo101}/comprobante-prueba.png`);
    expect(r.estado).not.toBe(200);
  });
});

describe("el mensaje con su adjunto", () => {
  it("no se cuelga en un hilo el archivo de otro", async () => {
    const r = await insertar(guillermo, "mensaje", {
      conversacion_id: hilo101,
      autor_id: guillermo.usuarioId,
      autor_nombre: "Guillermo",
      texto: `${MARCA_PRUEBA} adjunto ajeno`,
      adjunto_path: `${hilo205}/comprobante-prueba.png`,
    });
    expect(r.estado).toBeGreaterThanOrEqual(400);
    expect(JSON.stringify(r.datos)).toMatch(/mensaje_adjunto_de_su_conversacion/);
  });

  it("se manda, y quien lee la conversación ve el adjunto", async () => {
    const r = await insertar(guillermo, "mensaje?select=id", {
      conversacion_id: hilo101,
      autor_id: guillermo.usuarioId,
      autor_nombre: "Guillermo",
      texto: `${MARCA_PRUEBA} te mando el comprobante`,
      adjunto_path: `${hilo101}/comprobante-prueba.png`,
      adjunto_nombre: "comprobante.png",
      adjunto_tipo: "image/png",
    });
    expect(r.estado).toBe(201);
    mensajes.push(r.datos[0].id);

    const leidos = await rpc(porteria, "mensajes_de_conversacion", { p_conversacion_id: hilo101 });
    expect(leidos.estado).toBe(200);
    const suyo = leidos.datos.find((m: any) => m.id === r.datos[0].id);
    expect(suyo.adjunto_nombre).toBe("comprobante.png");
    expect(suyo.adjunto_path).toBe(`${hilo101}/comprobante-prueba.png`);
  });
});
