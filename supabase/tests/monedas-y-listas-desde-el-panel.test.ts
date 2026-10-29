import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { CLAVE_PRUEBA, CLAVE_SERVICIO, CUENTA, URL, entrar, rpc, type Sesion } from "./apoyo";

/**
 * Monedas, listas, interruptores y límites legales desde el panel de la app
 * (28/10/2026).
 *
 * Un dueño de usar y tirar --se crea aquí y se borra al terminar-- y Sofía,
 * vecina, que no es nadie en la plataforma. Cada «no puede» lleva al lado el
 * «sí puede» del dueño. Lo que se cambia se devuelve con la clave de servicio
 * leyendo la fila cruda, no por las funciones del panel: si una está mutada,
 * la restauración no puede pasar por ella.
 */

const SUFIJO = Date.now().toString(36);
const CORREO_DUENO = `listas-dueno-${SUFIJO}@veciyo.test`;

let dueno: Sesion;
let vecina: Sesion;
let cuentaDueno: string | null = null;
let cargoAntes: { id: string; etiqueta: string } | null = null;
let eurAntes: boolean | null = null;
const opcionesNuevas: string[] = [];

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

const mensaje = (r: { datos: unknown; mensaje?: string }) =>
  r.mensaje ?? (r.datos as { message?: string } | null)?.message ?? JSON.stringify(r.datos);

beforeAll(async () => {
  const r = await servicio("/auth/v1/admin/users", {
    method: "POST",
    body: JSON.stringify({ email: CORREO_DUENO, password: CLAVE_PRUEBA, email_confirm: true }),
  });
  const usuario = await r.json();
  if (!r.ok) throw new Error(`No se pudo crear la cuenta: ${JSON.stringify(usuario)}`);
  cuentaDueno = usuario.id;
  const s = await servicio("/rest/v1/staff_plataforma", {
    method: "POST",
    body: JSON.stringify({ usuario_id: usuario.id, rol: "dueno", activo: true, nota: "[prueba] monedas-y-listas" }),
  });
  if (!s.ok) throw new Error(`No se pudo dar el rol: ${await s.text()}`);
  [dueno, vecina] = await Promise.all([entrar(CORREO_DUENO), entrar(CUENTA.vecino)]);

  const c = await (
    await servicio("/rest/v1/catalogo_opcion?catalogo=eq.cargos_equipo_admin&codigo=eq.secretaria&select=id,etiqueta")
  ).json();
  cargoAntes = c[0] ?? null;
  expect(cargoAntes).not.toBeNull();
  const e = await (await servicio("/rest/v1/moneda?codigo=eq.EUR&select=activa")).json();
  eurAntes = e[0]?.activa ?? null;
  expect(eurAntes).not.toBeNull();
});

afterAll(async () => {
  const fallos: string[] = [];
  if (cargoAntes) {
    const r = await servicio(`/rest/v1/catalogo_opcion?id=eq.${cargoAntes.id}`, {
      method: "PATCH",
      body: JSON.stringify({ etiqueta: cargoAntes.etiqueta }),
    });
    if (!r.ok) fallos.push(`cargo: ${await r.text()}`);
  }
  if (eurAntes !== null) {
    const r = await servicio("/rest/v1/moneda?codigo=eq.EUR", { method: "PATCH", body: JSON.stringify({ activa: eurAntes }) });
    if (!r.ok) fallos.push(`EUR: ${await r.text()}`);
  }
  // Por la marca, no solo por lo apuntado: un caso que cae a medias no apunta.
  const r = await servicio(
    `/rest/v1/catalogo_opcion?etiqueta=like.${encodeURIComponent("[prueba]%")}`,
    { method: "DELETE" },
  );
  if (!r.ok) fallos.push(`opción nueva: ${await r.text()}`);
  if (cuentaDueno) {
    await servicio(`/rest/v1/bitacora_plataforma?actor_id=eq.${cuentaDueno}`, { method: "DELETE" });
    await servicio(`/rest/v1/staff_plataforma?usuario_id=eq.${cuentaDueno}`, { method: "DELETE" });
    const b = await servicio(`/auth/v1/admin/users/${cuentaDueno}`, { method: "DELETE" });
    if (!b.ok) fallos.push(`cuenta: ${await b.text()}`);
  }
  if (fallos.length) throw new Error(fallos.join("\n"));
});

describe("las monedas", () => {
  it("el dueño las ve con lo que las tiene en uso; una vecina no", async () => {
    const d = await rpc<{ codigo: string; activa: boolean; en_uso: string | null }[]>(dueno, "panel_monedas");
    expect(d.estado).toBe(200);
    const activas = d.datos.filter((m) => m.activa).map((m) => m.codigo).sort();
    expect(activas).toEqual(["COP", "PEN", "USD"]);
    expect(d.datos.find((m) => m.codigo === "COP")?.en_uso).toBeTruthy();

    const v = await rpc(vecina, "panel_monedas");
    expect(v.estado).toBe(403);
    expect(mensaje(v)).toMatch(/equipo de la plataforma/i);
  });

  it("no se puede apagar una moneda que usa un edificio", async () => {
    const r = await rpc(dueno, "panel_guardar_moneda", { p_codigo: "COP", p_cambios: { activa: false } });
    expect(r.estado).toBe(400);
    expect(mensaje(r)).toMatch(/No se puede apagar COP/);
  });

  it("una apagada se enciende y se vuelve a apagar; la vecina no puede", async () => {
    const v = await rpc(vecina, "panel_guardar_moneda", { p_codigo: "EUR", p_cambios: { activa: true } });
    expect(v.estado).toBe(403);

    const on = await rpc(dueno, "panel_guardar_moneda", { p_codigo: "EUR", p_cambios: { activa: true } });
    expect(on.estado, mensaje(on)).toBe(204);
    const fila = await (await servicio("/rest/v1/moneda?codigo=eq.EUR&select=activa")).json();
    expect(fila[0].activa).toBe(true);

    const off = await rpc(dueno, "panel_guardar_moneda", { p_codigo: "EUR", p_cambios: { activa: false } });
    expect(off.estado, mensaje(off)).toBe(204);
  });
});

describe("las listas", () => {
  it("el panel solo enseña las que la app lee de verdad", async () => {
    const d = await rpc<{ catalogo: string }[]>(dueno, "panel_listas");
    expect(d.estado).toBe(200);
    const nombres = d.datos.map((l) => l.catalogo);
    expect(nombres).toContain("cargos_equipo_admin");
    expect(nombres).toContain("tipos_de_documento");
    // `torre_opciones` no la lee nadie desde el 20/10/2026.
    expect(nombres).not.toContain("torre_opciones");

    const v = await rpc(vecina, "panel_listas");
    expect(v.estado).toBe(403);
  });

  it("el dueño renombra una opción y la vecina no", async () => {
    const v = await rpc(vecina, "panel_guardar_opcion", { p_id: cargoAntes!.id, p_cambios: { etiqueta: "X" } });
    expect(v.estado).toBe(403);

    const r = await rpc(dueno, "panel_guardar_opcion", {
      p_id: cargoAntes!.id,
      p_cambios: { etiqueta: "Secretaría general" },
    });
    expect(r.estado, mensaje(r)).toBe(204);
    const fila = await (await servicio(`/rest/v1/catalogo_opcion?id=eq.${cargoAntes!.id}&select=etiqueta`)).json();
    expect(fila[0].etiqueta).toBe("Secretaría general");
  });

  it("de una opción solo cambian los datos que la lista declara", async () => {
    const r = await rpc(dueno, "panel_guardar_opcion", {
      p_id: cargoAntes!.id,
      p_cambios: { extra: { cualquier_cosa: true } },
    });
    expect(r.estado).toBe(400);
    expect(mensaje(r)).toMatch(/no se cambia el dato cualquier_cosa/);
  });

  it("una lista que nadie lee no se cambia, ni por la función", async () => {
    const t = await (await servicio("/rest/v1/catalogo_opcion?catalogo=eq.torre_opciones&select=id&limit=1")).json();
    expect(t[0]?.id).toBeTruthy();
    const r = await rpc(dueno, "panel_guardar_opcion", { p_id: t[0].id, p_cambios: { etiqueta: "Pisos" } });
    expect(r.estado).toBe(400);
    expect(mensaje(r)).toMatch(/todavía no la lee la app/);
  });

  it("se agrega a las que lo admiten, y no a las que guardan un tipo cerrado", async () => {
    const cerrada = await rpc(dueno, "panel_agregar_opcion", {
      p_catalogo: "plataformas_de_reserva",
      p_etiqueta: "[prueba] Vrbo",
    });
    expect(cerrada.estado).toBe(400);
    expect(mensaje(cerrada)).toMatch(/no se le agregan opciones/);

    // Una lista que lo admite pero que la app no lee todavía: tampoco.
    const desconectada = await rpc(dueno, "panel_agregar_opcion", {
      p_catalogo: "empresas_de_mensajeria",
      p_etiqueta: "[prueba] Servientrega",
    });
    expect(desconectada.estado).toBe(400);
    expect(mensaje(desconectada)).toMatch(/todavía no la lee la app/);

    const abierta = await rpc<string>(dueno, "panel_agregar_opcion", {
      p_catalogo: "motivos_eliminar_cuenta",
      p_etiqueta: "[prueba] Me mudo de país",
    });
    expect(abierta.estado, mensaje(abierta)).toBe(200);
    opcionesNuevas.push(abierta.datos);
    const fila = await (await servicio(`/rest/v1/catalogo_opcion?id=eq.${abierta.datos}&select=codigo,activo`)).json();
    expect(fila[0]).toEqual({ codigo: "prueba_me_mudo_de_pais", activo: true });
    await servicio(`/rest/v1/catalogo_opcion?id=eq.${abierta.datos}`, { method: "DELETE" });
  });
});

describe("los límites nuevos también los pone la base", () => {
  it("un contrato no dura más de lo que diga el ajuste", async () => {
    const c = await (await servicio("/rest/v1/contrato_arrendamiento?select=id,duracion_meses&limit=1")).json();
    expect(c[0]?.id).toBeTruthy();
    const r = await servicio(`/rest/v1/contrato_arrendamiento?id=eq.${c[0].id}`, {
      method: "PATCH",
      body: JSON.stringify({ duracion_meses: 601 }),
    });
    expect(r.status).toBe(400);
    expect(await r.text()).toMatch(/va de 1 a 600 meses/);
    // Y dentro del rango, sí (se deja como estaba).
    const ok = await servicio(`/rest/v1/contrato_arrendamiento?id=eq.${c[0].id}`, {
      method: "PATCH",
      body: JSON.stringify({ duracion_meses: c[0].duracion_meses }),
    });
    expect(ok.status).toBe(200);
  });

  it("el número de emergencias tiene el largo del ajuste", async () => {
    const e = await (await servicio("/rest/v1/condominio?telefono_policia=not.is.null&select=id,telefono_policia&limit=1")).json();
    expect(e[0]?.id).toBeTruthy();
    const r = await servicio(`/rest/v1/condominio?id=eq.${e[0].id}`, {
      method: "PATCH",
      body: JSON.stringify({ telefono_policia: "12" }),
    });
    expect(r.status).toBe(400);
    expect(await r.text()).toMatch(/entre 3 y 6 cifras/);
  });
});

describe("los interruptores son ajustes, y la vecina no los cambia", () => {
  it("tra_envio_real: el dueño sí, la vecina no", async () => {
    const v = await rpc(vecina, "panel_cambiar_parametro", { p_clave: "tra_envio_real", p_valor: "true" });
    expect(v.estado).toBeGreaterThanOrEqual(400);
    const fila = await (await servicio("/rest/v1/configuracion_plataforma?clave=eq.tra_envio_real&select=valor")).json();
    expect(fila[0].valor).toBe("false");

    // El dueño lo deja como está: lo que se comprueba es que puede.
    const d = await rpc(dueno, "panel_cambiar_parametro", { p_clave: "tra_envio_real", p_valor: "false" });
    expect(d.estado, mensaje(d)).toBe(200);
  });

  it("tusdatos_ambiente solo acepta pruebas o produccion", async () => {
    const r = await rpc(dueno, "panel_cambiar_parametro", { p_clave: "tusdatos_ambiente", p_valor: "prod" });
    expect(r.estado).toBeGreaterThanOrEqual(400);
    const fila = await (await servicio("/rest/v1/configuracion_plataforma?clave=eq.tusdatos_ambiente&select=valor")).json();
    expect(fila[0].valor).toBe("pruebas");
  });
});
