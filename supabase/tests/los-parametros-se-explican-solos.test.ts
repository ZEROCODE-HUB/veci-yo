import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { CLAVE, CLAVE_SERVICIO, CONDOMINIO, CUENTA, URL, api, entrar, rpc, type Respuesta, type Sesion } from "./apoyo";

/**
 * Los parámetros se explican solos y se cambian desde la base (18/10/2026).
 *
 * El cliente pidió que nada de negocio quede fijo en el código y que en la base
 * se sepa para qué sirve cada parámetro. Esto comprueba la pieza de abajo, la
 * que todos los demás parámetros van a usar:
 *
 *   · un valor que no corresponde a su tipo o a sus límites no se guarda, y
 *     tampoco un parámetro sin descripción;
 *   · una clave mal escrita revienta en vez de volver vacía;
 *   · el valor propio de un edificio manda sobre el general, pero solo si el
 *     parámetro lo permite;
 *   · quien no tiene sesión ve solo los parámetros públicos, y ninguna sesión
 *     puede escribir ninguno;
 *   · cada cambio queda anotado;
 *   · ninguna columna de la base queda sin explicar para qué sirve (el
 *     18/10/2026 se escribieron las 772 que faltaban).
 *
 * El parámetro de prueba lo crea este archivo y lo retira antes y después.
 */

const CLAVE_P = "prueba_tope_temporal";

const servicio = { token: CLAVE_SERVICIO, usuarioId: "", correo: "servicio" } as Sesion;

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

const parametroDePrueba = {
  clave: CLAVE_P,
  valor: "5",
  valor_por_defecto: "5",
  tipo: "entero",
  unidad: "personas",
  minimo: 1,
  maximo: 10,
  ambito: "edificio",
  categoria: "zonas",
  riesgo: "bajo",
  es_publico: true,
  descripcion: "[prueba] Parámetro de la prueba automática; se borra solo.",
};

async function retirar() {
  await conServicio(`/rest/v1/parametro_condominio?clave=eq.${CLAVE_P}`, "DELETE");
  await conServicio(`/rest/v1/configuracion_plataforma?clave=eq.${CLAVE_P}`, "DELETE");
  await conServicio(`/rest/v1/configuracion_historial?clave=eq.${CLAVE_P}`, "DELETE");
}

let vecina: Sesion;

beforeAll(async () => {
  await retirar();
  const creado = await conServicio("/rest/v1/configuracion_plataforma", "POST", parametroDePrueba);
  expect(creado.estado, creado.mensaje).toBe(201);
  vecina = await entrar(CUENTA.vecino);
});

afterAll(async () => {
  await retirar();
  const quedan = await conServicio(`/rest/v1/configuracion_plataforma?clave=eq.${CLAVE_P}`);
  expect(quedan.datos).toEqual([]);
});

describe("un valor que no sirve no se guarda", () => {
  it("rechaza un texto en un parámetro numérico", async () => {
    const r = await conServicio(`/rest/v1/configuracion_plataforma?clave=eq.${CLAVE_P}`, "PATCH", { valor: "muchos" });
    expect(r.estado).toBeGreaterThanOrEqual(400);
    expect(r.mensaje).toMatch(/no es un número/i);
  });

  it("rechaza un valor fuera de los límites", async () => {
    const r = await conServicio(`/rest/v1/configuracion_plataforma?clave=eq.${CLAVE_P}`, "PATCH", { valor: "11" });
    expect(r.estado).toBeGreaterThanOrEqual(400);
    expect(r.mensaje).toMatch(/mayor que el máximo/i);
  });

  it("rechaza un parámetro sin descripción", async () => {
    const r = await conServicio(`/rest/v1/configuracion_plataforma?clave=eq.${CLAVE_P}`, "PATCH", { descripcion: "  " });
    expect(r.estado).toBeGreaterThanOrEqual(400);
    expect(r.mensaje).toMatch(/necesita una descripción/i);
  });

  it("y un valor dentro de los límites sí se guarda", async () => {
    // Control positivo: sin él, una validación que lo rechazara todo pasaría.
    const r = await conServicio(`/rest/v1/configuracion_plataforma?clave=eq.${CLAVE_P}`, "PATCH", { valor: "6" });
    expect(r.estado, r.mensaje).toBe(200);
    expect(r.datos[0].valor).toBe("6");
  });
});

describe("cómo se lee un parámetro", () => {
  it("una clave que no existe revienta en vez de volver vacía", async () => {
    const r = await rpc(servicio, "parametro", { p_clave: "prueba_no_existe_jamas" });
    expect(r.estado).toBeGreaterThanOrEqual(400);
    expect(r.mensaje).toMatch(/Parámetro desconocido/);
  });

  it("el valor propio del edificio manda sobre el general", async () => {
    const propio = await conServicio("/rest/v1/parametro_condominio", "POST", {
      condominio_id: CONDOMINIO, clave: CLAVE_P, valor: "8", nota: "[prueba]",
    });
    expect(propio.estado, propio.mensaje).toBe(201);
    expect((await rpc(servicio, "parametro", { p_clave: CLAVE_P, p_condominio_id: CONDOMINIO })).datos).toBe("8");
    // Y sin edificio, el general.
    expect((await rpc(servicio, "parametro", { p_clave: CLAVE_P })).datos).toBe("6");
  });

  it("el valor propio también se valida con los límites del general", async () => {
    const r = await conServicio(`/rest/v1/parametro_condominio?clave=eq.${CLAVE_P}`, "PATCH", { valor: "0" });
    expect(r.estado).toBeGreaterThanOrEqual(400);
    expect(r.mensaje).toMatch(/menor que el mínimo/i);
  });

  it("un parámetro de toda la plataforma no acepta valor por edificio", async () => {
    const r = await conServicio("/rest/v1/parametro_condominio", "POST", {
      condominio_id: CONDOMINIO, clave: "calendario_max_por_pasada", valor: "10",
    });
    expect(r.estado).toBeGreaterThanOrEqual(400);
    expect(r.mensaje).toMatch(/no se puede cambiar por edificio/i);
  });
});

describe("lo que ve la app", () => {
  it("la vecina lee los parámetros públicos, con el valor de su edificio", async () => {
    const r = await rpc<{ clave: string; valor: string }[]>(vecina, "parametros_publicos", { p_condominio_id: CONDOMINIO });
    expect(r.estado, r.mensaje).toBe(200);
    expect(r.datos.find((p) => p.clave === CLAVE_P)?.valor).toBe("8");
  });

  it("pero nunca los internos", async () => {
    const r = await rpc<{ clave: string }[]>(vecina, "parametros_publicos", { p_condominio_id: CONDOMINIO });
    const claves = r.datos.map((p) => p.clave);
    expect(claves).not.toContain("calendario_intervalo_minutos");
    // Control: el interno existe, así que su ausencia es por el filtro.
    const existe = await conServicio("/rest/v1/configuracion_plataforma?clave=eq.calendario_intervalo_minutos");
    expect(existe.datos).toHaveLength(1);
  });

  it("quien no tiene sesión no puede leer un parámetro interno directo", async () => {
    const anonimo = { token: CLAVE, usuarioId: "", correo: "anonimo" } as Sesion;
    const r = await rpc(anonimo, "parametro", { p_clave: "calendario_intervalo_minutos" });
    expect(r.estado).toBe(401);
    expect(r.mensaje).toMatch(/permission denied/i);
    // Control: con sesión sí se lee (los valores por defecto de las tablas lo necesitan).
    const conSesion = await rpc(vecina, "parametro", { p_clave: "calendario_intervalo_minutos" });
    expect(conSesion.estado, conSesion.mensaje).toBe(200);
  });

  it("ni cambiar ninguno", async () => {
    await api(vecina, `/rest/v1/configuracion_plataforma?clave=eq.${CLAVE_P}`, { metodo: "PATCH", cuerpo: { valor: "9" } });
    const sigue = await conServicio(`/rest/v1/configuracion_plataforma?clave=eq.${CLAVE_P}`);
    expect(sigue.datos[0].valor).toBe("6");
  });
});

describe("cada cambio queda anotado", () => {
  it("el historial guarda el valor anterior y el nuevo", async () => {
    const r = await conServicio(`/rest/v1/configuracion_historial?clave=eq.${CLAVE_P}&condominio_id=is.null&order=cambiado_en`);
    const cambio = r.datos.find((h: any) => h.valor_anterior === "5" && h.valor_nuevo === "6");
    expect(cambio).toBeTruthy();
  });
});

describe("las columnas explican para qué sirven", () => {
  it("ninguna columna de la base queda sin descripción", async () => {
    const r = await rpc<{ tabla: string; columna: string }[]>(servicio, "columnas_sin_descripcion");
    expect(r.estado, r.mensaje).toBe(200);
    // Si esto falla: la migración que creó la columna tiene que llevar su
    // «comment on column», en español simple.
    expect(r.datos.map((c) => `${c.tabla}.${c.columna}`)).toEqual([]);
  });
});
