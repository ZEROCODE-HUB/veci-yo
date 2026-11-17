import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  CLAVE_SERVICIO,
  MARCA_PRUEBA,
  URL,
  entrar,
  insertar,
  rpc,
  type Sesion,
} from "./apoyo";

/**
 * Sin chat entre vecinos (17/11/2026, pedido del cliente).
 *
 * `condominio.chat_entre_vecinos`, apagado por defecto: en un canal del
 * edificio solo escribe el personal; los vecinos leen. Es una casilla que
 * expresa un permiso, así que la prueba la **invierte**: la misma vecina, en el
 * mismo canal, no escribe con el ajuste apagado y sí con él encendido.
 *
 * Corre en el **segundo edificio** (22222222…), que es solo de pruebas y no
 * tiene canales: este archivo se trae el suyo y se lo lleva. En «Las
 * Barranqueras» otros archivos necesitan que los vecinos escriban en los
 * canales, y cambiar allí el ajuste a mitad de una corrida en paralelo los
 * pondría rojos sin motivo.
 */

const CONDOMINIO_2 = "22222222-2222-2222-2222-222222222222";

let renata: Sesion; // administradora del segundo edificio
let bruno: Sesion; // propietario de la 901

let canal: string;
const mensajes: string[] = [];

function servicio(ruta: string, opciones: RequestInit = {}) {
  return fetch(`${URL}/rest/v1/${ruta}`, {
    ...opciones,
    headers: {
      apikey: CLAVE_SERVICIO,
      Authorization: `Bearer ${CLAVE_SERVICIO}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...(opciones.headers ?? {}),
    },
  });
}

async function ajuste(activo: boolean) {
  const r = await servicio(`condominio?id=eq.${CONDOMINIO_2}`, {
    method: "PATCH",
    body: JSON.stringify({ chat_entre_vecinos: activo }),
  });
  expect(r.status, await r.text()).toBe(200);
}

const escribir = (sesion: Sesion, texto: string) =>
  insertar<{ id: string }[]>(sesion, "mensaje?select=id", {
    conversacion_id: canal,
    autor_id: sesion.usuarioId,
    autor_nombre: MARCA_PRUEBA,
    texto,
  });

beforeAll(async () => {
  [renata, bruno] = await Promise.all([
    entrar("admin2@veciyo.test"),
    entrar("vecino2@veciyo.test"),
  ]);

  // El propio cero: lo que dejó una corrida que murió a mitad.
  await servicio(
    `conversacion?condominio_id=eq.${CONDOMINIO_2}&tipo=eq.grupo&nombre=like.${encodeURIComponent(`${MARCA_PRUEBA}%`)}`,
    { method: "DELETE" },
  );
  await ajuste(false);

  const creado = await servicio("conversacion?select=id", {
    method: "POST",
    body: JSON.stringify({
      condominio_id: CONDOMINIO_2,
      tipo: "grupo",
      nombre: `${MARCA_PRUEBA} propietarios`,
      creada_por: renata.usuarioId,
    }),
  });
  const filas = (await creado.json()) as { id: string }[];
  expect(creado.status, JSON.stringify(filas)).toBe(201);
  canal = filas[0].id;

  const roles = await servicio("canal_rol", {
    method: "POST",
    body: JSON.stringify([
      { conversacion_id: canal, rol_unidad: "propietario", rol_condominio: null },
      { conversacion_id: canal, rol_unidad: null, rol_condominio: "administrador" },
    ]),
  });
  expect(roles.status, await roles.text()).toBe(201);
});

afterAll(async () => {
  for (const id of mensajes) {
    await servicio(`mensaje?id=eq.${id}`, { method: "DELETE" });
  }
  if (canal) {
    const r = await servicio(`conversacion?id=eq.${canal}`, { method: "DELETE" });
    expect(r.status).toBe(200);
  }
  await ajuste(false);
});

describe("con el chat entre vecinos apagado (lo de fábrica)", () => {
  it("el vecino ve el canal pero no escribe en él", async () => {
    // Control: el canal es suyo, así que lo que lo frena es el ajuste.
    const ve = await rpc<boolean>(bruno, "puede_ver_conversacion", {
      p_conversacion_id: canal,
    });
    expect(ve.datos).toBe(true);

    const puede = await rpc<boolean>(bruno, "puede_escribir_en_conversacion", {
      p_conversacion_id: canal,
    });
    expect(puede.datos).toBe(false);

    const r = await escribir(bruno, `${MARCA_PRUEBA} hola vecinos`);
    expect(r.estado).toBe(400);
    expect(r.mensaje).toMatch(/chat entre vecinos está desactivado/i);
  });

  it("la administración sí escribe", async () => {
    const r = await escribir(renata, `${MARCA_PRUEBA} aviso de la administracion`);
    expect(r.estado, JSON.stringify(r.datos)).toBe(201);
    mensajes.push(r.datos[0].id);
  });
});

describe("con el chat entre vecinos encendido", () => {
  it("el mismo vecino, en el mismo canal, escribe", async () => {
    await ajuste(true);
    try {
      const r = await escribir(bruno, `${MARCA_PRUEBA} ahora si`);
      expect(r.estado, JSON.stringify(r.datos)).toBe(201);
      mensajes.push(r.datos[0].id);
    } finally {
      await ajuste(false);
    }
  });
});
