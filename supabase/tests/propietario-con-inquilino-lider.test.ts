import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  CLAVE_PRUEBA,
  CLAVE_SERVICIO,
  CONDOMINIO,
  CUENTA,
  MARCA_PRUEBA,
  UNIDAD,
  URL,
  entrar,
  actualizar,
  insertar,
  leer,
  rpc,
  type Sesion,
} from "./apoyo";

/**
 * Con inquilino líder, el propietario no ve el día a día (18/11/2026, pedido
 * del cliente): ni la correspondencia, ni las visitas, ni las reservas de esa
 * vivienda, ni le llegan sus avisos. Las de sus otras viviendas, sí.
 *
 * Guillermo es propietario de la 101 y la 206. La prueba le pone a la 101 un
 * inquilino líder de usar y tirar, y cada cosa se comprueba en las dos
 * viviendas a la vez: en la 101 no, en la 206 sí. La administración (Marcela)
 * y el propio inquilino líder sí ven las de la 101.
 */

const cabeceras = {
  apikey: CLAVE_SERVICIO,
  Authorization: `Bearer ${CLAVE_SERVICIO}`,
  "Content-Type": "application/json",
  Prefer: "return=representation",
};
const servicio = (ruta: string, opciones: RequestInit = {}) =>
  fetch(`${URL}/rest/v1/${ruta}`, { ...opciones, headers: { ...cabeceras, ...(opciones.headers ?? {}) } });

let guillermo: Sesion;
let marcela: Sesion;
let inquilino: Sesion;
let inquilinoId = "";
let membresiaId = "";
let sofia: Sesion;
let residente: Sesion;
let residenteId = "";
let residenteMembresia = "";
const filas = { correspondencia: [] as string[], visita: [] as string[] };
const MARCA = `${MARCA_PRUEBA} día a día`;

async function crear(tabla: "correspondencia" | "visita", unidad: string): Promise<string> {
  const fila =
    tabla === "correspondencia"
      ? { condominio_id: CONDOMINIO, unidad_id: unidad, descripcion: MARCA }
      : {
          condominio_id: CONDOMINIO,
          unidad_id: unidad,
          tipo: "temporal",
          estado: "programada",
          profesion: MARCA,
          fecha_desde: new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10),
        };
  const r = await servicio(`${tabla}?select=id`, { method: "POST", body: JSON.stringify(fila) });
  const datos = await r.json();
  expect(r.ok, JSON.stringify(datos)).toBe(true);
  filas[tabla].push(datos[0].id);
  return datos[0].id;
}

async function limpiar() {
  for (const ruta of [
    `notificacion?mensaje=like.${encodeURIComponent(`${MARCA}*`)}`,
    `correspondencia?descripcion=eq.${encodeURIComponent(MARCA)}`,
    `visita?profesion=eq.${encodeURIComponent(MARCA)}`,
  ]) {
    const b = await servicio(ruta, { method: "DELETE" });
    expect(b.ok, `${ruta}: ${await b.text()}`).toBe(true);
  }
  if (membresiaId) {
    const b = await servicio(`membresia_unidad?id=eq.${membresiaId}`, { method: "DELETE" });
    expect(b.ok, await b.text()).toBe(true);
    membresiaId = "";
  }
  if (residenteMembresia) {
    const b = await servicio(`membresia_unidad?id=eq.${residenteMembresia}`, { method: "DELETE" });
    expect(b.ok, await b.text()).toBe(true);
    residenteMembresia = "";
  }
  // Las invitaciones de prueba (no tienen política de borrado: clave de servicio).
  const inv = await servicio(`invitacion?nombre=like.${encodeURIComponent(`${MARCA}*`)}`, { method: "DELETE" });
  expect(inv.ok, await inv.text()).toBe(true);
  for (const id of [inquilinoId, residenteId].filter(Boolean)) {
    await servicio(`notificacion?usuario_id=eq.${id}`, { method: "DELETE" });
    const b = await fetch(`${URL}/auth/v1/admin/users/${id}`, { method: "DELETE", headers: cabeceras });
    expect(b.ok, await b.text()).toBe(true);
  }
  inquilinoId = "";
  residenteId = "";
}

async function cuentaNueva(etiqueta: string): Promise<{ correo: string; id: string }> {
  const correo = `${etiqueta}-${Date.now().toString(36)}@veciyo.test`;
  const alta = await fetch(`${URL}/auth/v1/admin/users`, {
    method: "POST",
    headers: cabeceras,
    body: JSON.stringify({ email: correo, password: CLAVE_PRUEBA, email_confirm: true }),
  });
  const usuario = await alta.json();
  expect(alta.ok, JSON.stringify(usuario)).toBe(true);
  await servicio("perfil", { method: "POST", body: JSON.stringify({ id: usuario.id, nombre: MARCA_PRUEBA, apellido: etiqueta }) });
  return { correo, id: usuario.id };
}

beforeAll(async () => {
  [guillermo, marcela, sofia] = await Promise.all([
    entrar(CUENTA.propietario),
    entrar(CUENTA.admin),
    entrar(CUENTA.vecino),
  ]);
  await limpiar();

  // Una residente con cuenta en la 101, para los privilegios y el contacto.
  const r = await cuentaNueva("residente-dia");
  residenteId = r.id;
  const rm = await servicio("membresia_unidad?select=id", {
    method: "POST",
    body: JSON.stringify({ unidad_id: UNIDAD.u101, usuario_id: residenteId, rol: "residente", activo: true, es_residente: true, nombre: `${MARCA_PRUEBA} Residente` }),
  });
  const rmDatos = await rm.json();
  expect(rm.ok, JSON.stringify(rmDatos)).toBe(true);
  residenteMembresia = rmDatos[0].id;
  residente = await entrar(r.correo);

  const correo = `inquilino-dia-${Date.now().toString(36)}@veciyo.test`;
  const alta = await fetch(`${URL}/auth/v1/admin/users`, {
    method: "POST",
    headers: cabeceras,
    body: JSON.stringify({ email: correo, password: CLAVE_PRUEBA, email_confirm: true }),
  });
  const usuario = await alta.json();
  expect(alta.ok, JSON.stringify(usuario)).toBe(true);
  inquilinoId = usuario.id;
  await servicio("perfil", { method: "POST", body: JSON.stringify({ id: inquilinoId, nombre: MARCA_PRUEBA, apellido: "Inquilino" }) });
  const m = await servicio("membresia_unidad?select=id", {
    method: "POST",
    body: JSON.stringify({ unidad_id: UNIDAD.u101, usuario_id: inquilinoId, rol: "inquilino_lider", activo: true, es_residente: true, nombre: `${MARCA_PRUEBA} Inquilino` }),
  });
  const mDatos = await m.json();
  expect(m.ok, JSON.stringify(mDatos)).toBe(true);
  membresiaId = mDatos[0].id;
  inquilino = await entrar(correo);

  await Promise.all([
    crear("correspondencia", UNIDAD.u101),
    crear("correspondencia", UNIDAD.u206),
    crear("visita", UNIDAD.u101),
    crear("visita", UNIDAD.u206),
  ]);
}, 60_000);

afterAll(limpiar, 60_000);

const cuantas = async (s: Sesion, tabla: string, unidad: string) => {
  const columna = tabla === "correspondencia" ? "descripcion" : "profesion";
  const r = await leer<unknown[]>(s, `${tabla}?select=id&unidad_id=eq.${unidad}&${columna}=eq.${encodeURIComponent(MARCA)}`);
  expect(r.estado, r.mensaje).toBe(200);
  return r.datos.length;
};

describe("con inquilino líder, el propietario no ve el día a día", () => {
  for (const tabla of ["correspondencia", "visita"] as const) {
    it(`${tabla}: el propietario no la ve en la 101 y sí en la 206`, async () => {
      expect(await cuantas(guillermo, tabla, UNIDAD.u101)).toBe(0);
      expect(await cuantas(guillermo, tabla, UNIDAD.u206)).toBe(1);
    });

    it(`${tabla}: el inquilino líder y la administración sí la ven en la 101`, async () => {
      expect(await cuantas(inquilino, tabla, UNIDAD.u101)).toBe(1);
      expect(await cuantas(marcela, tabla, UNIDAD.u101)).toBe(1);
    });
  }

  it("al propietario no le llega el aviso de un paquete de la 101; al inquilino líder sí", async () => {
    const r = await fetch(`${URL}/rest/v1/rpc/notificar_unidad`, {
      method: "POST",
      headers: cabeceras,
      body: JSON.stringify({
        p_unidad_id: UNIDAD.u101,
        p_tipo: "correspondencia_recibida",
        p_titulo: "Paquete",
        p_mensaje: `${MARCA} paquete`,
      }),
    });
    expect(r.ok, await r.text()).toBe(true);
    const avisos = await servicio(`notificacion?select=usuario_id&mensaje=eq.${encodeURIComponent(`${MARCA} paquete`)}`);
    const quienes = ((await avisos.json()) as { usuario_id: string }[]).map((a) => a.usuario_id);
    expect(quienes).not.toContain(guillermo.usuarioId);
    // El inquilino líder lo recibe si no apagó ese aviso; su cuenta es nueva.
    expect(quienes).toContain(inquilinoId);
  });

  it("y un anuncio, sí: eso no es el día a día", async () => {
    const r = await fetch(`${URL}/rest/v1/rpc/notificar_unidad`, {
      method: "POST",
      headers: cabeceras,
      body: JSON.stringify({
        p_unidad_id: UNIDAD.u101,
        p_tipo: "anuncio_publicado",
        p_titulo: "Anuncio",
        p_mensaje: `${MARCA} anuncio`,
      }),
    });
    expect(r.ok, await r.text()).toBe(true);
    const avisos = await servicio(`notificacion?select=usuario_id&mensaje=eq.${encodeURIComponent(`${MARCA} anuncio`)}`);
    const quienes = ((await avisos.json()) as { usuario_id: string }[]).map((a) => a.usuario_id);
    expect(quienes).toContain(guillermo.usuarioId);
  });
});

const visitaDe = (s: Sesion) =>
  insertar(s, "visita?select=id", {
    condominio_id: CONDOMINIO,
    unidad_id: UNIDAD.u101,
    tipo: "temporal",
    estado: "programada",
    profesion: MARCA,
    registrada_por: s.usuarioId,
    fecha_desde: new Date(Date.now() + 6 * 86400000).toISOString().slice(0, 10),
  });

const invitar = (s: Sesion, unidad: string, rol: string) =>
  rpc(s, "crear_invitacion", {
    p_condominio_id: CONDOMINIO,
    p_ambito: "unidad",
    p_correo: `invitado-${rol}-${Date.now().toString(36)}@veciyo.test`,
    p_nombre: `${MARCA} ${rol}`,
    p_unidad_id: unidad,
    p_rol_unidad: rol,
  });

describe("quién invita a quién", () => {
  it("el propietario invita a un copropietario de su vivienda; un inquilino líder, no", async () => {
    const deSofia = await invitar(sofia, UNIDAD.u102, "propietario");
    expect(deSofia.estado, deSofia.mensaje).toBe(200);
    const delInquilino = await invitar(inquilino, UNIDAD.u101, "propietario");
    expect(delInquilino.mensaje).toMatch(/copropietario/);
  });

  it("el inquilino líder invita residentes, no otro inquilino líder", async () => {
    const otro = await invitar(inquilino, UNIDAD.u101, "inquilino_lider");
    expect(otro.mensaje).toMatch(/lo invita el propietario/);
    const resi = await invitar(inquilino, UNIDAD.u101, "residente");
    expect(resi.estado, resi.mensaje).toBe(200);
  });
});

describe("privilegios por persona", () => {
  it("quien gestiona la vivienda le quita a una residente registrar visitas, y se lo devuelve", async () => {
    const quita = await rpc(guillermo, "cambiar_privilegios_de_persona", {
      p_membresia_id: residenteMembresia,
      p_registra_visitas: false,
      p_reserva_zonas: null,
    });
    expect(quita.estado, quita.mensaje).toBe(204);
    const sin = await visitaDe(residente);
    expect(sin.mensaje).toMatch(/te quitó el permiso de registrar visitas/);

    const devuelve = await rpc(guillermo, "cambiar_privilegios_de_persona", {
      p_membresia_id: residenteMembresia,
      p_registra_visitas: true,
      p_reserva_zonas: null,
    });
    expect(devuelve.estado, devuelve.mensaje).toBe(204);
    // Y la residente, por su rol, sí registra visitas (18/11/2026).
    const con = await visitaDe(residente);
    expect(con.estado, con.mensaje).toBe(201);
  });

  it("nadie se cambia sus propios privilegios", async () => {
    const propio = await rpc(residente, "cambiar_privilegios_de_persona", {
      p_membresia_id: residenteMembresia,
      p_registra_visitas: true,
      p_reserva_zonas: true,
    });
    expect(propio.estado).toBeGreaterThanOrEqual(400);
  });
});

describe("el contacto de emergencia", () => {
  it("lo pone el inquilino líder; la residente no se lo pone sola", async () => {
    const propio = await actualizar(residente, `membresia_unidad?id=eq.${residenteMembresia}`, {
      contacto_emergencia_nombre: `${MARCA} contacto`,
    });
    expect(propio.mensaje).toMatch(/lo ponen el propietario o el inquilino líder/);
    const delInquilino = await actualizar(inquilino, `membresia_unidad?id=eq.${residenteMembresia}`, {
      contacto_emergencia_nombre: `${MARCA} contacto`,
    });
    expect(delInquilino.estado, delInquilino.mensaje).toBe(200);
    expect(delInquilino.datos).toHaveLength(1);
  });
});

describe("la renta corta del inquilino líder", () => {
  it("se la da el propietario, y al dársela queda como no residente; él no se la da solo", async () => {
    const solo = await rpc(inquilino, "dar_renta_corta_al_inquilino", { p_membresia_id: membresiaId, p_dar: true });
    expect(solo.mensaje).toMatch(/la da el propietario/);
    const antes = await rpc<boolean>(inquilino, "puede_configurar_alojamiento", { p_unidad_id: UNIDAD.u101 });
    expect(antes.datos).toBe(false);

    const da = await rpc(guillermo, "dar_renta_corta_al_inquilino", { p_membresia_id: membresiaId, p_dar: true });
    expect(da.estado, da.mensaje).toBe(204);
    const fila = await servicio(`membresia_unidad?select=puede_renta_corta,es_residente&id=eq.${membresiaId}`);
    expect(await fila.json()).toEqual([{ puede_renta_corta: true, es_residente: false }]);
    const despues = await rpc<boolean>(inquilino, "puede_configurar_alojamiento", { p_unidad_id: UNIDAD.u101 });
    expect(despues.datos).toBe(true);

    const quita = await rpc(guillermo, "dar_renta_corta_al_inquilino", { p_membresia_id: membresiaId, p_dar: false });
    expect(quita.estado, quita.mensaje).toBe(204);
  });
});
