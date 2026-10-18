import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { CLAVE_SERVICIO, CONDOMINIO, CUENTA, MARCA_PRUEBA, UNIDAD, URL, entrar, rpc, type Respuesta, type Sesion } from "./apoyo";

/**
 * Los parámetros mandan (18/10/2026).
 *
 * Que un valor viva en configuracion_plataforma no sirve de nada si el código
 * sigue usando su propio número. Cada caso de aquí **cambia el parámetro**,
 * hace lo que la app haría y comprueba que el resultado siguió al parámetro y
 * no al valor viejo. Al terminar, cada parámetro vuelve a su valor.
 *
 * Se elige siempre un valor distinto del de fábrica: con el mismo, el caso
 * pasaría igual con el número escrito a mano.
 */

async function conServicio<T = any>(ruta: string, metodo = "GET", cuerpo?: unknown): Promise<Respuesta<T>> {
  const r = await fetch(`${URL}${ruta}`, {
    method: metodo,
    headers: {
      apikey: CLAVE_SERVICIO,
      Authorization: `Bearer ${CLAVE_SERVICIO}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
  });
  const texto = await r.text();
  let datos: any = null;
  try {
    datos = texto ? JSON.parse(texto) : null;
  } catch {
    datos = texto;
  }
  return { estado: r.status, datos, mensaje: datos?.message };
}

const originales = new Map<string, string>();

/** Cambia un parámetro y recuerda su valor para devolverlo al final. */
async function poner(clave: string, valor: string) {
  if (!originales.has(clave)) {
    const r = await conServicio(`/rest/v1/configuracion_plataforma?clave=eq.${clave}&select=valor`);
    expect(r.datos, `el parámetro ${clave} existe`).toHaveLength(1);
    originales.set(clave, r.datos[0].valor);
  }
  const r = await conServicio(`/rest/v1/configuracion_plataforma?clave=eq.${clave}`, "PATCH", { valor });
  expect(r.estado, r.mensaje).toBe(200);
}

const DIA = 24 * 60 * 60 * 1000;
const CORREO_INVITADO = "prueba.parametros@veciyo.test";

let marcela: Sesion;

beforeAll(async () => {
  marcela = await entrar(CUENTA.admin);
  await conServicio(`/rest/v1/invitacion?correo=eq.${encodeURIComponent(CORREO_INVITADO)}`, "DELETE");
});

afterAll(async () => {
  for (const [clave, valor] of originales) {
    await conServicio(`/rest/v1/configuracion_plataforma?clave=eq.${clave}`, "PATCH", { valor });
  }
  await conServicio(`/rest/v1/invitacion?correo=eq.${encodeURIComponent(CORREO_INVITADO)}`, "DELETE");
  // Comprobar que todo volvió: una limpieza que no comprueba no es una limpieza.
  for (const [clave, valor] of originales) {
    const r = await conServicio(`/rest/v1/configuracion_plataforma?clave=eq.${clave}&select=valor`);
    expect(r.datos[0].valor, `${clave} volvió a su valor`).toBe(valor);
  }
});

describe("invitaciones", () => {
  it("una invitación vence a los días que diga el parámetro", async () => {
    await poner("invitacion_dias_validez", "9");
    const creada = await rpc(marcela, "crear_invitacion", {
      p_condominio_id: CONDOMINIO,
      p_ambito: "unidad",
      p_correo: CORREO_INVITADO,
      p_nombre: `${MARCA_PRUEBA} Parámetros`,
      p_unidad_id: UNIDAD.u301,
      p_rol_unidad: "residente",
    });
    expect(creada.estado, creada.mensaje).toBe(200);
    const fila = await conServicio(`/rest/v1/invitacion?correo=eq.${encodeURIComponent(CORREO_INVITADO)}&select=expira_en`);
    const dias = (new Date(fila.datos[0].expira_en).getTime() - Date.now()) / DIA;
    expect(dias).toBeGreaterThan(8.9);
    expect(dias).toBeLessThan(9.1);
  });
});
