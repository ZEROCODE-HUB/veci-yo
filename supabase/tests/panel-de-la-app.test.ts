import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  CLAVE,
  CLAVE_PRUEBA,
  CLAVE_SERVICIO,
  CUENTA,
  URL,
  entrar,
  fueRechazada,
  rpc,
  type Sesion,
} from "./apoyo";

/**
 * El panel del administrador de la app (23/10/2026): ajustes, precios,
 * textos legales y cuentas.
 *
 * Tres personas: un dueño y un soporte de usar y tirar --se crean aquí y se
 * borran al terminar, para no depender de que exista uno-- y Sofía, vecina,
 * que no es nadie en la plataforma. Cada «no puede» lleva al lado el «sí
 * puede» del dueño: sin eso, un rechazo no prueba nada.
 *
 * Lo que se cambia se devuelve leyendo la fila cruda con la clave de servicio,
 * no por las funciones del panel: si una está mutada, la restauración no puede
 * pasar por ella.
 */

const SUFIJO = Date.now().toString(36);
const INICIO = new Date(Date.now() - 60_000).toISOString();
const CORREO_DUENO = `panel-dueno-${SUFIJO}@veciyo.test`;
const CORREO_SOPORTE = `panel-soporte-${SUFIJO}@veciyo.test`;
/** Un entero con rango y riesgo bajo; no lo lee ninguna otra prueba. */
const AJUSTE = "zona_cupos_por_defecto";

let dueno: Sesion;
let soporte: Sesion;
let vecina: Sesion;
const cuentas: string[] = [];
let ajusteAntes: string | null = null;
let precioAntes: { id: string; monto: number; vigente_desde: string; vigente_hasta: string | null } | null = null;
let preciosNuevos: string[] = [];

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

async function crearCuenta(correo: string, rol: "dueno" | "soporte") {
  const r = await servicio("/auth/v1/admin/users", {
    method: "POST",
    body: JSON.stringify({ email: correo, password: CLAVE_PRUEBA, email_confirm: true }),
  });
  const usuario = await r.json();
  if (!r.ok) throw new Error(`No se pudo crear ${correo}: ${JSON.stringify(usuario)}`);
  cuentas.push(usuario.id);
  const s = await servicio("/rest/v1/staff_plataforma", {
    method: "POST",
    body: JSON.stringify({ usuario_id: usuario.id, rol, activo: true, nota: "[prueba] panel-de-la-app" }),
  });
  if (!s.ok) throw new Error(`No se pudo dar el rol: ${await s.text()}`);
}

const llamarFuncion = (sesion: Sesion, cuerpo: unknown) =>
  fetch(`${URL}/functions/v1/panel-usuarios`, {
    method: "POST",
    headers: { apikey: CLAVE, Authorization: `Bearer ${sesion.token}`, "Content-Type": "application/json" },
    body: JSON.stringify(cuerpo),
  });

beforeAll(async () => {
  await crearCuenta(CORREO_DUENO, "dueno");
  await crearCuenta(CORREO_SOPORTE, "soporte");
  [dueno, soporte, vecina] = await Promise.all([
    entrar(CORREO_DUENO),
    entrar(CORREO_SOPORTE),
    entrar(CUENTA.vecino),
  ]);

  const a = await (await servicio(`/rest/v1/configuracion_plataforma?clave=eq.${AJUSTE}&select=valor`)).json();
  ajusteAntes = a[0]?.valor ?? null;
  expect(ajusteAntes).not.toBeNull();

  const p = await (
    await servicio(
      "/rest/v1/precio_plan?vigente_hasta=is.null&pais=is.null&select=id,monto,vigente_desde,vigente_hasta,plan_suscripcion!inner(clave)&plan_suscripcion.clave=eq.renta_corta",
    )
  ).json();
  precioAntes = p[0] ?? null;
  expect(precioAntes).not.toBeNull();
});

afterAll(async () => {
  const fallos: string[] = [];
  if (ajusteAntes !== null) {
    const r = await servicio(`/rest/v1/configuracion_plataforma?clave=eq.${AJUSTE}`, {
      method: "PATCH",
      body: JSON.stringify({ valor: ajusteAntes }),
    });
    if (!r.ok) fallos.push(`ajuste: ${await r.text()}`);
  }
  if (precioAntes) {
    // Por la fecha y no por lo apuntado: si el caso cayó antes de apuntar, el
    // precio nuevo existe igual y no dejaría reabrir el viejo (índice único).
    const sobrantes = await (
      await servicio(
        `/rest/v1/precio_plan?pais=is.null&id=neq.${precioAntes.id}&created_at=gte.${INICIO}&select=id,plan_suscripcion!inner(clave)&plan_suscripcion.clave=eq.renta_corta`,
      )
    ).json();
    for (const id of [...new Set([...preciosNuevos, ...sobrantes.map((x: { id: string }) => x.id)])].filter((id) => id !== precioAntes?.id)) {
      const r = await servicio(`/rest/v1/precio_plan?id=eq.${id}`, { method: "DELETE" });
      if (!r.ok) fallos.push(`precio nuevo: ${await r.text()}`);
    }
    const r = await servicio(`/rest/v1/precio_plan?id=eq.${precioAntes.id}`, {
      method: "PATCH",
      body: JSON.stringify({ monto: precioAntes.monto, vigente_hasta: precioAntes.vigente_hasta }),
    });
    if (!r.ok) fallos.push(`precio: ${await r.text()}`);
  }
  for (const id of cuentas) {
    await servicio(`/rest/v1/bitacora_plataforma?actor_id=eq.${id}`, { method: "DELETE" });
    await servicio(`/rest/v1/staff_plataforma?usuario_id=eq.${id}`, { method: "DELETE" });
    const r = await servicio(`/auth/v1/admin/users/${id}`, { method: "DELETE" });
    if (!r.ok) fallos.push(`cuenta ${id}: ${await r.text()}`);
  }
  if (fallos.length) throw new Error(fallos.join("\n"));
});

describe("los ajustes de la app", () => {
  it("el dueño y soporte los ven; una vecina no", async () => {
    const d = await rpc<{ clave: string }[]>(dueno, "panel_parametros");
    expect(d.estado).toBe(200);
    expect(d.datos.some((p) => p.clave === AJUSTE)).toBe(true);

    const s = await rpc<unknown[]>(soporte, "panel_parametros");
    expect(s.estado).toBe(200);
    expect(s.datos.length).toBe(d.datos.length);

    const v = await rpc(vecina, "panel_parametros");
    expect(fueRechazada(v)).toBe(true);
    expect(String(v.mensaje)).toMatch(/Solo el equipo/);
  });

  it("el dueño cambia uno, queda en el historial con su nombre y en la bitácora", async () => {
    const nuevo = ajusteAntes === "2" ? "3" : "2";
    const r = await rpc(dueno, "panel_cambiar_parametro", { p_clave: AJUSTE, p_valor: nuevo });
    expect(r.estado).toBe(200);

    const fila = await (await servicio(`/rest/v1/configuracion_plataforma?clave=eq.${AJUSTE}&select=valor`)).json();
    expect(fila[0].valor).toBe(nuevo);

    const h = await (
      await servicio(
        `/rest/v1/configuracion_historial?clave=eq.${AJUSTE}&order=cambiado_en.desc&limit=1&select=valor_nuevo,cambiado_por`,
      )
    ).json();
    expect(h[0]).toEqual({ valor_nuevo: nuevo, cambiado_por: dueno.usuarioId });

    const b = await (
      await servicio(`/rest/v1/bitacora_plataforma?actor_id=eq.${dueno.usuarioId}&accion=eq.parametro_cambiado&select=detalle`)
    ).json();
    expect(b.some((x: { detalle: { clave: string } }) => x.detalle.clave === AJUSTE)).toBe(true);
  });

  it("un valor fuera de rango lo rechaza la base", async () => {
    const r = await rpc(dueno, "panel_cambiar_parametro", { p_clave: AJUSTE, p_valor: "999999" });
    expect(fueRechazada(r)).toBe(true);
  });

  it("soporte no puede cambiarlo, ni la vecina", async () => {
    const s = await rpc(soporte, "panel_cambiar_parametro", { p_clave: AJUSTE, p_valor: "4" });
    expect(String(s.mensaje)).toMatch(/Solo el dueño/);
    const v = await rpc(vecina, "panel_cambiar_parametro", { p_clave: AJUSTE, p_valor: "4" });
    expect(String(v.mensaje)).toMatch(/Solo el dueño/);
  });
});

describe("los precios", () => {
  it("soporte los ve y no los cambia; el dueño abre uno nuevo desde hoy", async () => {
    const s = await rpc<{ plan: string }[]>(soporte, "panel_precios");
    expect(s.estado).toBe(200);
    expect(s.datos.some((p) => p.plan === "renta_corta")).toBe(true);
    const cambioSoporte = await rpc(soporte, "panel_cambiar_precio", {
      p_plan: "renta_corta", p_pais: "", p_monto: 1, p_moneda: "USD",
    });
    expect(String(cambioSoporte.mensaje)).toMatch(/Solo el dueño/);
    expect(fueRechazada(await rpc(vecina, "panel_precios"))).toBe(true);

    const r = await rpc(dueno, "panel_cambiar_precio", {
      p_plan: "renta_corta", p_pais: "", p_monto: 16.5, p_moneda: "USD",
    });
    expect(r.estado).toBeLessThan(300);

    const vigentes = await (
      await servicio(
        "/rest/v1/precio_plan?vigente_hasta=is.null&pais=is.null&select=id,monto,plan_suscripcion!inner(clave)&plan_suscripcion.clave=eq.renta_corta",
      )
    ).json();
    expect(vigentes).toHaveLength(1);
    expect(Number(vigentes[0].monto)).toBe(16.5);
    preciosNuevos = vigentes.map((v: { id: string }) => v.id);
  });
});

describe("los textos legales", () => {
  it("soporte los ve; publicar es solo del dueño, y nunca los de un edificio", async () => {
    expect((await rpc(soporte, "panel_documentos_legales")).estado).toBe(200);
    expect(fueRechazada(await rpc(vecina, "panel_documentos_legales"))).toBe(true);

    const s = await rpc(soporte, "panel_publicar_documento_legal", {
      p_tipo: "privacidad", p_titulo: "x", p_contenido: "x",
    });
    expect(String(s.mensaje)).toMatch(/Solo el dueño/);

    const edificio = await rpc(dueno, "panel_publicar_documento_legal", {
      p_tipo: "terminos_condominio", p_titulo: "x", p_contenido: "x",
    });
    expect(String(edificio.mensaje)).toMatch(/administración/);
  });
});

describe("las cuentas", () => {
  it("la lista sale sin buscar, por páginas, y filtra si se escribe; la vecina no la ve", async () => {
    const primera = await rpc<{ usuario_id: string; total: number }[]>(soporte, "panel_listar_usuarios", {
      p_pagina: 1,
      p_por_pagina: 2,
    });
    expect(primera.estado).toBe(200);
    expect(primera.datos).toHaveLength(2);
    const total = Number(primera.datos[0].total);
    expect(total).toBeGreaterThan(2);

    // La segunda página no repite a nadie de la primera.
    const segunda = await rpc<{ usuario_id: string }[]>(soporte, "panel_listar_usuarios", {
      p_pagina: 2,
      p_por_pagina: 2,
    });
    const deLaPrimera = primera.datos.map((f) => f.usuario_id);
    expect(segunda.datos.some((f) => deLaPrimera.includes(f.usuario_id))).toBe(false);

    // Con texto, solo las que lo tienen.
    const filtrada = await rpc<{ correo: string; total: number }[]>(soporte, "panel_listar_usuarios", {
      p_texto: CUENTA.vecino,
    });
    expect(filtrada.datos.map((f) => f.correo)).toEqual([CUENTA.vecino]);
    expect(Number(filtrada.datos[0].total)).toBe(1);

    const v = await rpc(vecina, "panel_listar_usuarios", {});
    expect(String(v.mensaje)).toMatch(/Solo el equipo/);
  });

  it("el equipo busca; ve el edificio y el rol, y la vecina no busca", async () => {
    const r = await rpc<{ correo: string; edificios: { rol: string }[] }[]>(soporte, "panel_buscar_usuarios", {
      p_texto: CUENTA.vecino,
    });
    expect(r.estado).toBe(200);
    expect(r.datos[0].correo).toBe(CUENTA.vecino);
    expect(r.datos[0].edificios.some((e) => e.rol === "propietario")).toBe(true);

    const v = await rpc(vecina, "panel_buscar_usuarios", { p_texto: CUENTA.admin });
    expect(String(v.mensaje)).toMatch(/Solo el equipo/);
  });

  it("la función de cuentas: soporte y la vecina no actúan; el dueño bloquea y desbloquea", async () => {
    const objetivo = cuentas[1];
    expect((await llamarFuncion(soporte, { accion: "bloquear", usuarioId: objetivo })).status).toBe(403);
    expect((await llamarFuncion(vecina, { accion: "bloquear", usuarioId: objetivo })).status).toBe(403);

    const yo = await llamarFuncion(dueno, { accion: "bloquear", usuarioId: dueno.usuarioId });
    expect(yo.status).toBe(409);

    const b = await llamarFuncion(dueno, { accion: "bloquear", usuarioId: objetivo });
    expect(b.status).toBe(200);
    const bloqueada = await rpc<{ bloqueada: boolean }[]>(dueno, "panel_buscar_usuarios", { p_texto: CORREO_SOPORTE });
    expect(bloqueada.datos[0].bloqueada).toBe(true);

    const d = await llamarFuncion(dueno, { accion: "desbloquear", usuarioId: objetivo });
    expect(d.status).toBe(200);
    const libre = await rpc<{ bloqueada: boolean }[]>(dueno, "panel_buscar_usuarios", { p_texto: CORREO_SOPORTE });
    expect(libre.datos[0].bloqueada).toBe(false);
  });

  it("suspender: con motivo, no puede entrar, lee su motivo y nadie más; reactivar lo deshace", async () => {
    const objetivo = cuentas[1];
    // Su token de antes, para leer su suspensión como haría la app abierta.
    const sesionDeAntes = soporte;

    const sinMotivo = await llamarFuncion(dueno, { accion: "suspender", usuarioId: objetivo, motivo: " " });
    expect(sinMotivo.status).toBe(400);
    expect((await llamarFuncion(vecina, { accion: "suspender", usuarioId: objetivo, motivo: "porque sí" })).status).toBe(403);

    const s = await llamarFuncion(dueno, { accion: "suspender", usuarioId: objetivo, motivo: "Uso indebido de la portería" });
    expect(s.status).toBe(200);
    // A @veciyo.test no se manda nada: el correo lo dice en vez de rebotar.
    const cuerpo = await s.json();
    expect(cuerpo.correo.enviado).toBe(false);
    expect(cuerpo.correo.motivo).toMatch(/cuentas de prueba/);

    // No puede entrar.
    const entrarSuspendida = await fetch(`${URL}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: { apikey: CLAVE, "Content-Type": "application/json" },
      body: JSON.stringify({ email: CORREO_SOPORTE, password: CLAVE_PRUEBA }),
    });
    expect(entrarSuspendida.status).toBe(400);
    expect((await entrarSuspendida.json()).error_code).toBe("user_banned");

    // Con la sesión que tenía abierta, lee su motivo; la vecina no lo ve.
    const suya = await rpc<{ motivo: string }[]>(sesionDeAntes, "mi_suspension");
    expect(suya.datos[0]?.motivo).toBe("Uso indebido de la portería");
    const ajena = await rpc<unknown[]>(vecina, "mi_suspension");
    expect(ajena.datos).toEqual([]);
    const tabla = await (await fetch(`${URL}/rest/v1/suspension_cuenta?usuario_id=eq.${objetivo}&select=motivo`, {
      headers: { apikey: CLAVE, Authorization: `Bearer ${vecina.token}` },
    })).json();
    expect(tabla).toEqual([]);

    // El panel enseña el motivo.
    const lista = await rpc<{ bloqueada: boolean; motivo_suspension: string }[]>(dueno, "panel_listar_usuarios", { p_texto: CORREO_SOPORTE });
    expect(lista.datos[0]).toMatchObject({ bloqueada: true, motivo_suspension: "Uso indebido de la portería" });

    const r = await llamarFuncion(dueno, { accion: "reactivar", usuarioId: objetivo });
    expect(r.status).toBe(200);
    const entrarOtraVez = await fetch(`${URL}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: { apikey: CLAVE, "Content-Type": "application/json" },
      body: JSON.stringify({ email: CORREO_SOPORTE, password: CLAVE_PRUEBA }),
    });
    expect(entrarOtraVez.status).toBe(200);
    const despues = await rpc<{ bloqueada: boolean; motivo_suspension: string | null }[]>(dueno, "panel_listar_usuarios", { p_texto: CORREO_SOPORTE });
    expect(despues.datos[0]).toMatchObject({ bloqueada: false, motivo_suspension: null });
  });
});

describe("el correo de Veciyo", () => {
  const pedir = (token: string, enlace: string) =>
    fetch(`${URL}/functions/v1/enviar-correo`, {
      method: "POST",
      headers: { apikey: CLAVE, Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ tipo: "invitacion", correo: "alguien@veciyo.test", nombre: "x", enlace }),
    });

  it("sin sesión no manda nada; con sesión sí, y solo enlaces de la web de Veciyo", async () => {
    expect((await pedir(CLAVE, "https://veciyo-web-seven.vercel.app/invitacion?token=x")).status).toBe(401);

    const conSesion = await pedir(vecina.token, "https://veciyo-web-seven.vercel.app/invitacion?token=x");
    expect(conSesion.status).toBe(200);
    // A @veciyo.test no sale: se dice por qué.
    expect((await conSesion.json()).motivo).toMatch(/cuentas de prueba/);

    const ajeno = await pedir(vecina.token, "https://estafa.example.com/entrar");
    expect(ajeno.status).toBe(400);
  });
});
