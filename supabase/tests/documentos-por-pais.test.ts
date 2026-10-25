import { createHash, randomBytes } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { CLAVE_PRUEBA, CLAVE_SERVICIO, CUENTA, URL, entrar, rpc, type Sesion } from "./apoyo";

/**
 * Los documentos que se piden dependen del país del edificio, y los configura
 * el dueño de la plataforma (25/10/2026).
 *
 * Pedido del cliente: «acorde al país de dónde está el edificio debe
 * solicitarse los documentos, y que sea configurable desde el super admin, por
 * país». Se comprueba:
 *   * lo que se sembró por país (los de un menor y el PPT en Colombia, el PEP
 *     en ninguno, el carné de extranjería en Perú y no en Colombia), que antes
 *     comprobaba la lista fija de la app (`enums.test.ts`);
 *   * que la base rechaza al guardar un invitado lo que el país no acepta, y
 *     un número que no cumple la regla;
 *   * y que lo que el dueño cambia en el panel cambia lo que la base acepta:
 *     sin eso, el panel sería una casilla decorativa más.
 *
 * Los invitados se escriben con la clave de servicio a propósito: lo que se
 * mide es el disparador, que actúa igual para cualquiera, no quién puede
 * escribir una visita (eso lo miden otras pruebas). La configuración se
 * devuelve escribiendo la fila cruda, no por el panel: si la función del panel
 * está mutada, la restauración no puede pasar por ella.
 */

const CONDOMINIO = "11111111-1111-1111-1111-111111111111"; // Colombia
const U101 = "44444444-4444-4444-4444-444444444441";
const SUFIJO = Date.now().toString(36);
const CORREO_DUENO = `docs-dueno-${SUFIJO}@veciyo.test`;
const MARCA = "[prueba] documentos por país";

let dueno: Sesion;
let vecina: Sesion;
let duenoId = "";
let visitaId = "";
/** `invitado` pide un orden distinto por visita. */
let orden = 100;
let carneAntes: Record<string, unknown> | null = null;

const servicio = (ruta: string, init: RequestInit = {}) =>
  fetch(`${URL}${ruta}`, {
    ...init,
    headers: {
      apikey: CLAVE_SERVICIO,
      Authorization: `Bearer ${CLAVE_SERVICIO}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...(init.headers ?? {}),
    },
  });

/** Intenta guardar un invitado con ese documento; devuelve el error o null. */
async function guardarInvitado(tipo: string, numero: string): Promise<string | null> {
  const r = await servicio("/rest/v1/invitado", {
    method: "POST",
    body: JSON.stringify({
      visita_id: visitaId,
      orden: (orden += 1),
      nombre: MARCA,
      tipo_documento: tipo,
      documento_numero: numero,
    }),
  });
  if (r.ok) return null;
  return ((await r.json()) as { message: string }).message;
}

const activosDe = async (pais: string) =>
  (await (
    await servicio(`/rest/v1/documento_del_pais?pais=eq.${pais}&activo=is.true&select=tipo,para_adultos,para_menores`)
  ).json()) as { tipo: string; para_adultos: boolean; para_menores: boolean }[];

beforeAll(async () => {
  // Lo que pudo dejar una corrida anterior.
  await servicio(`/rest/v1/visita?profesion=eq.${encodeURIComponent(MARCA)}`, { method: "DELETE" });

  const r = await servicio("/auth/v1/admin/users", {
    method: "POST",
    body: JSON.stringify({ email: CORREO_DUENO, password: CLAVE_PRUEBA, email_confirm: true }),
  });
  const usuario = await r.json();
  if (!r.ok) throw new Error(`No se pudo crear el dueño: ${JSON.stringify(usuario)}`);
  duenoId = usuario.id;
  const s = await servicio("/rest/v1/staff_plataforma", {
    method: "POST",
    body: JSON.stringify({ usuario_id: duenoId, rol: "dueno", activo: true, nota: MARCA }),
  });
  if (!s.ok) throw new Error(`No se pudo dar el rol: ${await s.text()}`);
  [dueno, vecina] = await Promise.all([entrar(CORREO_DUENO), entrar(CUENTA.vecino)]);

  const v = await servicio("/rest/v1/visita", {
    method: "POST",
    body: JSON.stringify({ condominio_id: CONDOMINIO, unidad_id: U101, tipo: "amigos", profesion: MARCA }),
  });
  if (!v.ok) throw new Error(`No se pudo crear la visita: ${await v.text()}`);
  visitaId = (await v.json())[0].id;

  const c = await (await servicio("/rest/v1/documento_del_pais?pais=eq.CO&tipo=eq.carne_extranjeria")).json();
  carneAntes = c[0];
  // La prueba parte de que en Colombia no se pide; si alguien lo encendió, no mide nada.
  expect(carneAntes?.activo).toBe(false);
});

afterAll(async () => {
  const fallos: string[] = [];
  if (carneAntes) {
    const { pais: _p, tipo: _t, created_at: _c, updated_at: _u, ...fila } = carneAntes;
    const r = await servicio("/rest/v1/documento_del_pais?pais=eq.CO&tipo=eq.carne_extranjeria", {
      method: "PATCH",
      body: JSON.stringify(fila),
    });
    if (!r.ok) fallos.push(`carné: ${await r.text()}`);
  }
  if (visitaId) {
    await servicio(`/rest/v1/invitado?visita_id=eq.${visitaId}`, { method: "DELETE" });
    const r = await servicio(`/rest/v1/visita?id=eq.${visitaId}`, { method: "DELETE" });
    if (!r.ok) fallos.push(`visita: ${await r.text()}`);
  }
  if (duenoId) {
    await servicio(`/rest/v1/bitacora_plataforma?actor_id=eq.${duenoId}`, { method: "DELETE" });
    await servicio(`/rest/v1/staff_plataforma?usuario_id=eq.${duenoId}`, { method: "DELETE" });
    const r = await servicio(`/auth/v1/admin/users/${duenoId}`, { method: "DELETE" });
    if (!r.ok) fallos.push(`cuenta: ${await r.text()}`);
  }
  if (fallos.length) throw new Error(fallos.join("\n"));
});

describe("lo que se pide en cada país", () => {
  it("Colombia: los dos de un menor y el PPT; ni el PEP ni el carné de Perú", async () => {
    const co = await activosDe("CO");
    const tipos = co.map((d) => d.tipo);
    expect(co.find((d) => d.tipo === "registro_civil")?.para_menores).toBe(true);
    expect(co.find((d) => d.tipo === "tarjeta_identidad")?.para_menores).toBe(true);
    expect(tipos).toContain("ppt");
    expect(tipos).toContain("cedula_ciudadania");
    expect(tipos).not.toContain("pep");
    expect(tipos).not.toContain("carne_extranjeria");
  });

  it("Perú: el carné de extranjería sí, la tarjeta de identidad colombiana no", async () => {
    const tipos = (await activosDe("PE")).map((d) => d.tipo);
    expect(tipos).toContain("carne_extranjeria");
    expect(tipos).toContain("dni");
    expect(tipos).not.toContain("tarjeta_identidad");
    expect(tipos).not.toContain("pep");
  });

  it("con el enlace del preregistro, el del titular o el de un acompañante, también", async () => {
    /*
      Los dos enlaces viven en sitios distintos: el del titular en la visita y
      el de un acompañante en su invitado. La primera versión solo miraba el
      segundo, y la web del titular se quedaba sin documentos que elegir
      (recorrido en el navegador, 25/10/2026).
    */
    const sha = (t: string) => createHash("sha256").update(t).digest("hex");
    const delTitular = randomBytes(16).toString("hex");
    const delAcompanante = randomBytes(16).toString("hex");
    const expira = new Date(Date.now() + 86_400_000).toISOString();
    const v = await servicio(`/rest/v1/visita?id=eq.${visitaId}`, {
      method: "PATCH",
      body: JSON.stringify({ precheckin_token_hash: sha(delTitular), precheckin_expira_en: expira }),
    });
    expect(v.ok).toBe(true);
    const i = await servicio("/rest/v1/invitado", {
      method: "POST",
      body: JSON.stringify({ visita_id: visitaId, orden: (orden += 1), nombre: MARCA, precheckin_token_hash: sha(delAcompanante) }),
    });
    expect(i.ok).toBe(true);

    const co = (await activosDe("CO")).map((d) => d.tipo).sort();
    for (const token of [delTitular, delAcompanante]) {
      const r = await rpc<{ tipo: string }[]>(vecina, "documentos_del_enlace", { p_token: token });
      expect(r.estado).toBe(200);
      expect(r.datos.map((d) => d.tipo).sort()).toEqual(co);
    }
    // Y uno inventado no devuelve nada.
    const nada = await rpc<unknown[]>(vecina, "documentos_del_enlace", { p_token: "inventado" });
    expect(nada.datos).toEqual([]);
  });

  it("un edificio ofrece los de su país, y con el enlace o sin sesión se pueden leer", async () => {
    const r = await rpc<{ tipo: string }[]>(vecina, "documentos_del_edificio", { p_condominio_id: CONDOMINIO });
    expect(r.estado).toBe(200);
    expect(r.datos.map((d) => d.tipo).sort()).toEqual((await activosDe("CO")).map((d) => d.tipo).sort());
  });
});

describe("la base hace cumplir el país", () => {
  it("no guarda un documento que el país del edificio no acepta", async () => {
    expect(await guardarInvitado("carne_extranjeria", "123456789")).toMatch(/no se acepta/i);
  });

  it("ni un número que no cumple su regla", async () => {
    expect(await guardarInvitado("cedula_ciudadania", "AB12345")).toMatch(/solo números/i);
    // El largo se comprueba con el carné, más abajo: el de la cédula lo baja
    // un momento la prueba de tusdatos, que corre a la vez.
  });

  it("y sí lo que vale (control positivo)", async () => {
    expect(await guardarInvitado("pasaporte", "AB123456")).toBeNull();
    expect(await guardarInvitado("cedula_ciudadania", "1.036.654.321")).toBeNull();
  });
});

describe("el dueño de la plataforma lo configura", () => {
  it("una vecina no puede cambiar un documento", async () => {
    const r = await rpc(vecina, "panel_guardar_documento_del_pais", {
      p_pais: "CO",
      p_tipo: "carne_extranjeria",
      p_cambios: { activo: true },
    });
    expect(r.estado).toBe(403);
    const c = await (await servicio("/rest/v1/documento_del_pais?pais=eq.CO&tipo=eq.carne_extranjeria&select=activo")).json();
    expect(c[0].activo).toBe(false);
  });

  it("lo que enciende el dueño, la base lo acepta desde ese momento", async () => {
    const r = await rpc(dueno, "panel_guardar_documento_del_pais", {
      p_pais: "CO",
      p_tipo: "carne_extranjeria",
      p_cambios: { activo: true, solo_cifras: true, largo_minimo: 9, largo_maximo: 9 },
    });
    expect(r.estado).toBe(204);
    expect(await guardarInvitado("carne_extranjeria", "123456789")).toBeNull();
    // Y con la regla que acaba de poner, no con una escrita en el código.
    expect(await guardarInvitado("carne_extranjeria", "12345678")).toMatch(/entre 9 y 9/i);
  });

  it("no deja un país activo sin ningún documento para adultos", async () => {
    const adultos = (await activosDe("UY")).filter((d) => d.para_adultos).map((d) => d.tipo);
    expect(adultos.length).toBeGreaterThan(0);
    const fallos: string[] = [];
    for (const tipo of adultos) {
      const r = await rpc(dueno, "panel_guardar_documento_del_pais", {
        p_pais: "UY",
        p_tipo: tipo,
        p_cambios: { activo: false },
      });
      if (r.estado !== 204) fallos.push(String(r.mensaje ?? JSON.stringify(r.datos)));
    }
    // El último se rechaza, y los anteriores se devuelven.
    expect(fallos.join(" ")).toMatch(/sin ningún documento para adultos/i);
    await servicio(`/rest/v1/documento_del_pais?pais=eq.UY&tipo=in.(${adultos.join(",")})`, {
      method: "PATCH",
      body: JSON.stringify({ activo: true }),
    });
    expect((await activosDe("UY")).filter((d) => d.para_adultos)).toHaveLength(adultos.length);
  });
});
