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
  insertar,
  leer,
  rpc,
  type Sesion,
} from "./apoyo";

/**
 * El profesional permanente con cuenta (18/11/2026, pedido del cliente).
 *
 * Quien lo registra decide si contesta el citófono y si crea visitas; le
 * llegan los anuncios que van para los profesionales permanentes. Nada más de
 * la vivienda. Cada negativo con su positivo al lado.
 *
 * Se trae sus dos cuentas (una con permisos, otra sin) y se las lleva.
 */

const cabeceras = {
  apikey: CLAVE_SERVICIO,
  Authorization: `Bearer ${CLAVE_SERVICIO}`,
  "Content-Type": "application/json",
  Prefer: "return=representation",
};
const servicio = (ruta: string, opciones: RequestInit = {}) =>
  fetch(`${URL}/rest/v1/${ruta}`, { ...opciones, headers: { ...cabeceras, ...(opciones.headers ?? {}) } });

const TITULO = `${MARCA_PRUEBA} profesional permanente`;

interface Cuenta {
  correo: string;
  usuarioId: string;
  trabajadorId: string;
  sesion: Sesion;
}

let sofia: Sesion; // propietaria de la 102
let marcela: Sesion; // administradora
let conPermisos: Cuenta;
let sinPermisos: Cuenta;
const usuariosCreados: string[] = [];

async function crearCuenta(etiqueta: string): Promise<{ correo: string; usuarioId: string }> {
  const correo = `${etiqueta}-${Date.now().toString(36)}@veciyo.test`;
  const alta = await fetch(`${URL}/auth/v1/admin/users`, {
    method: "POST",
    headers: cabeceras,
    body: JSON.stringify({ email: correo, password: CLAVE_PRUEBA, email_confirm: true }),
  });
  const usuario = await alta.json();
  expect(alta.ok, JSON.stringify(usuario)).toBe(true);
  usuariosCreados.push(usuario.id);
  const perfil = await servicio("perfil", {
    method: "POST",
    body: JSON.stringify({ id: usuario.id, nombre: MARCA_PRUEBA, apellido: etiqueta }),
  });
  expect(perfil.ok, await perfil.text()).toBe(true);
  return { correo, usuarioId: usuario.id };
}

/** Sofía lo registra con app y los permisos dados; él acepta. */
async function registrar(etiqueta: string, permisos: { citofono: boolean; visitas: boolean }): Promise<Cuenta> {
  const { correo, usuarioId } = await crearCuenta(etiqueta);
  const alta = await rpc<string>(sofia, "agregar_trabajador_de_la_vivienda", {
    p_unidad_id: UNIDAD.u102,
    p_nombre: `${MARCA_PRUEBA} ${etiqueta}`,
    p_con_app: true,
    p_correo: correo,
    p_puede_contestar_citofono: permisos.citofono,
    p_puede_crear_visitas: permisos.visitas,
  });
  expect(alta.estado, alta.mensaje).toBe(200);
  const sesion = await entrar(correo);
  const acepta = await rpc(sesion, "responder_mi_invitacion_de_trabajador", { p_id: alta.datos, p_acepta: true });
  expect(acepta.estado, acepta.mensaje).toBe(204);
  return { correo, usuarioId, trabajadorId: alta.datos, sesion };
}

async function limpiar() {
  // Las visitas de la prueba (de cualquiera de las cuentas) y lo que cuelga.
  const r = await servicio(`invitado?select=visita_id&nombre=like.${encodeURIComponent(`${MARCA_PRUEBA} visita del profesional*`)}`);
  const visitas = [...new Set(((await r.json()) as { visita_id: string }[]).map((f) => f.visita_id))];
  for (const id of visitas) {
    for (const ruta of [`notificacion?entidad_id=eq.${id}`, `invitado?visita_id=eq.${id}`, `visita?id=eq.${id}`]) {
      const b = await servicio(ruta, { method: "DELETE" });
      expect(b.ok, `${ruta}: ${await b.text()}`).toBe(true);
    }
  }
  const p = await servicio(`publicacion?select=id&titulo=like.${encodeURIComponent(`${TITULO}*`)}`);
  for (const { id } of (await p.json()) as { id: string }[]) {
    for (const ruta of [`notificacion?entidad_id=eq.${id}`, `publicacion?id=eq.${id}`]) {
      const b = await servicio(ruta, { method: "DELETE" });
      expect(b.ok, `${ruta}: ${await b.text()}`).toBe(true);
    }
  }
  const t = await servicio(
    `trabajador_de_la_vivienda?unidad_id=eq.${UNIDAD.u102}&nombre=like.${encodeURIComponent(`${MARCA_PRUEBA}*`)}`,
    { method: "DELETE" },
  );
  expect(t.ok, await t.text()).toBe(true);
  for (const id of usuariosCreados.splice(0)) {
    const b = await fetch(`${URL}/auth/v1/admin/users/${id}`, { method: "DELETE", headers: cabeceras });
    expect(b.ok, await b.text()).toBe(true);
  }
}

beforeAll(async () => {
  [sofia, marcela] = await Promise.all([entrar(CUENTA.vecino), entrar(CUENTA.admin)]);
  await limpiar();
  conPermisos = await registrar("prof-con", { citofono: true, visitas: true });
  sinPermisos = await registrar("prof-sin", { citofono: false, visitas: false });
}, 60_000);

afterAll(limpiar, 60_000);

const nuevaVisita = (s: Sesion, nombre: string) =>
  insertar(s, "visita?select=id", {
    condominio_id: CONDOMINIO,
    unidad_id: UNIDAD.u102,
    tipo: "amigos",
    estado: "programada",
    fecha_desde: new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10),
    registrada_por: s.usuarioId,
  }).then(async (r) => {
    if (r.estado === 201) {
      const inv = await insertar(s, "invitado", { visita_id: r.datos[0].id, nombre, es_titular: true });
      expect(inv.estado, inv.mensaje).toBe(201);
    }
    return r;
  });

describe("el profesional permanente con cuenta", () => {
  it("crea visitas solo con permiso, y ve solo las suyas", async () => {
    const sin = await nuevaVisita(sinPermisos.sesion, `${MARCA_PRUEBA} visita del profesional sin`);
    expect(sin.estado).toBeGreaterThanOrEqual(400);

    const con = await nuevaVisita(conPermisos.sesion, `${MARCA_PRUEBA} visita del profesional con`);
    expect(con.estado, con.mensaje).toBe(201);
    const suya = con.datos[0].id as string;

    // Una de Sofía en la misma vivienda: él no la ve; ella sí ve la de él.
    const deSofia = await nuevaVisita(sofia, `${MARCA_PRUEBA} visita del profesional de Sofía`);
    expect(deSofia.estado, deSofia.mensaje).toBe(201);
    const ve = await leer<{ id: string }[]>(conPermisos.sesion, `visita?select=id&unidad_id=eq.${UNIDAD.u102}`);
    expect(ve.datos.map((v) => v.id)).toEqual([suya]);
    const veSofia = await leer<{ id: string }[]>(sofia, `visita?select=id&id=eq.${suya}`);
    expect(veSofia.datos).toHaveLength(1);
  });

  it("no crea una visita de otro tipo ni para otra vivienda", async () => {
    const otraVivienda = await insertar(conPermisos.sesion, "visita?select=id", {
      condominio_id: CONDOMINIO,
      unidad_id: UNIDAD.u101,
      tipo: "amigos",
      estado: "programada",
      fecha_desde: new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10),
      registrada_por: conPermisos.usuarioId,
    });
    expect(otraVivienda.estado).toBeGreaterThanOrEqual(400);
    const huesped = await insertar(conPermisos.sesion, "visita?select=id", {
      condominio_id: CONDOMINIO,
      unidad_id: UNIDAD.u102,
      tipo: "huesped_temporal",
      estado: "programada",
      fecha_desde: new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10),
      registrada_por: conPermisos.usuarioId,
    });
    expect(huesped.estado).toBeGreaterThanOrEqual(400);
  });

  it("el citófono le suena solo con permiso", async () => {
    const suena = async (usuarioId: string) => {
      const r = await fetch(`${URL}/rest/v1/rpc/le_suena_la_llamada`, {
        method: "POST",
        headers: cabeceras,
        body: JSON.stringify({
          p_usuario_id: usuarioId,
          p_destino: "vivienda",
          p_origen: "porteria",
          p_condominio_id: CONDOMINIO,
          p_a_unidad_id: UNIDAD.u102,
          p_quien_llama: null,
        }),
      });
      expect(r.ok, await r.clone().text()).toBe(true);
      return (await r.json()) as boolean;
    };
    expect(await suena(conPermisos.usuarioId)).toBe(true);
    expect(await suena(sinPermisos.usuarioId)).toBe(false);
  });

  it("ve los anuncios que van para los profesionales permanentes, y solo esos", async () => {
    const publicar = (titulo: string, paraTrabajadores: boolean) =>
      insertar(marcela, "publicacion?select=id", {
        condominio_id: CONDOMINIO,
        categoria: "administracion",
        titulo,
        tipo: "anuncio",
        creada_por: marcela.usuarioId,
        para_propietarios: !paraTrabajadores,
        para_residentes: false,
        para_huespedes: false,
        para_porteria: false,
        para_trabajadores: paraTrabajadores,
        avisar: true,
      });
    const suyo = await publicar(`${TITULO} para ellos`, true);
    expect(suyo.estado, suyo.mensaje).toBe(201);
    const ajeno = await publicar(`${TITULO} para propietarios`, false);
    expect(ajeno.estado, ajeno.mensaje).toBe(201);

    const ve = await leer<{ titulo: string }[]>(
      sinPermisos.sesion,
      `publicacion?select=titulo&titulo=like.${encodeURIComponent(`${TITULO}*`)}`,
    );
    expect(ve.datos.map((p) => p.titulo)).toEqual([`${TITULO} para ellos`]);

    // Le llega el aviso del suyo.
    const avisos = await servicio(
      `notificacion?select=entidad_id&usuario_id=eq.${sinPermisos.usuarioId}&tipo=eq.anuncio_publicado`,
    );
    const ids = ((await avisos.json()) as { entidad_id: string }[]).map((a) => a.entidad_id);
    expect(ids).toContain(suyo.datos[0].id);
    expect(ids).not.toContain(ajeno.datos[0].id);
  });
});
