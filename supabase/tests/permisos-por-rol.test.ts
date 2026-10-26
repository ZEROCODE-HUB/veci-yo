import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  CLAVE_PRUEBA,
  CLAVE_SERVICIO,
  CONDOMINIO,
  CUENTA,
  MARCA_PRUEBA,
  UNIDAD,
  URL,
  api,
  crearDuenoDePrueba,
  crearZonaDePrueba,
  entrar,
  fechaEnDias,
  fueRechazada,
  insertar,
  rpc,
  type Sesion,
} from "./apoyo";

/**
 * Qué puede hacer cada rol, configurable desde el panel (huecos 9 y 14).
 *
 * El dueño de la plataforma decide, en general y por edificio, qué puede el
 * residente, el corresidente, el coadministrador de vivienda, el inquilino
 * líder y el coadministrador del edificio. La base lo aplica con un
 * disparador por acción, así que da igual si se intenta desde la app.
 *
 * Se trae sus cuentas: un residente de la 205 y un coadministrador del
 * edificio, creados y retirados aquí, y un dueño de la plataforma de usar y
 * tirar. Al terminar, la regla general vuelve a como estaba y no queda
 * ninguna excepción del edificio.
 */

const servicio: Sesion = { token: CLAVE_SERVICIO, usuarioId: "", correo: "" };
const cabeceras = {
  apikey: CLAVE_SERVICIO,
  Authorization: `Bearer ${CLAVE_SERVICIO}`,
  "Content-Type": "application/json",
};

let residente: Sesion;
let coadmin: Sesion;
let dueno: Sesion;
let retirarDueno: () => Promise<void>;
let zona: { id: string; retirar: () => Promise<void> };
const cuentas: string[] = [];
let generalOriginal: { rol: string; accion: string; permitido: boolean }[] = [];

async function cuentaDePrueba(etiqueta: string): Promise<string> {
  const correo = `${etiqueta}-${Date.now().toString(36)}@veciyo.test`;
  const alta = await fetch(`${URL}/auth/v1/admin/users`, {
    method: "POST",
    headers: cabeceras,
    body: JSON.stringify({ email: correo, password: CLAVE_PRUEBA, email_confirm: true }),
  });
  const usuario = await alta.json();
  if (!alta.ok) throw new Error(JSON.stringify(usuario));
  cuentas.push(usuario.id);
  await fetch(`${URL}/rest/v1/perfil`, {
    method: "POST",
    headers: cabeceras,
    body: JSON.stringify({ id: usuario.id, nombre: etiqueta, apellido: "[prueba]" }),
  });
  return correo;
}

const cambiar = (rol: string, accion: string, permitido: boolean | null, condominio: string | null = null) =>
  rpc(dueno, "panel_cambiar_permiso_de_rol", {
    p_condominio_id: condominio,
    p_rol: rol,
    p_accion: accion,
    p_permitido: permitido,
  });

const visitaDe = (quien: Sesion) =>
  insertar(quien, "visita", {
    condominio_id: CONDOMINIO,
    unidad_id: UNIDAD.u205,
    tipo: "amigos",
    registrada_por: quien.usuarioId,
    fecha_desde: fechaEnDias(12),
    fecha_hasta: fechaEnDias(12),
    anotaciones_ingreso: `${MARCA_PRUEBA} permisos por rol`,
  });

beforeAll(async () => {
  const general = await api(servicio, "/rest/v1/permiso_de_rol?condominio_id=is.null&select=rol,accion,permitido");
  generalOriginal = general.datos;
  await api(servicio, `/rest/v1/permiso_de_rol?condominio_id=eq.${CONDOMINIO}`, { metodo: "DELETE" });

  const d = await crearDuenoDePrueba("permisos-rol");
  retirarDueno = d.retirar;
  dueno = await entrar(d.correo);

  const correoResidente = await cuentaDePrueba("residente-permisos");
  const correoCoadmin = await cuentaDePrueba("coadmin-permisos");
  residente = await entrar(correoResidente);
  coadmin = await entrar(correoCoadmin);
  const m1 = await insertar(servicio, "membresia_unidad", {
    unidad_id: UNIDAD.u205,
    usuario_id: residente.usuarioId,
    nombre: "Residente de prueba",
    rol: "residente",
    es_residente: true,
    activo: true,
  });
  expect(m1.estado).toBe(201);
  const m2 = await insertar(servicio, "membresia_condominio", {
    condominio_id: CONDOMINIO,
    usuario_id: coadmin.usuarioId,
    rol: "coadministrador",
    activo: true,
  });
  expect(m2.estado).toBe(201);

  const marcela = await entrar(CUENTA.admin);
  zona = await crearZonaDePrueba(marcela, { permite_estancia_larga: true, requiere_aprobacion: false });
});

afterAll(async () => {
  for (const f of generalOriginal) {
    await api(servicio, `/rest/v1/permiso_de_rol?condominio_id=is.null&rol=eq.${f.rol}&accion=eq.${f.accion}`, {
      metodo: "PATCH",
      cuerpo: { permitido: f.permitido },
    });
  }
  await api(servicio, `/rest/v1/permiso_de_rol?condominio_id=eq.${CONDOMINIO}`, { metodo: "DELETE" });
  await api(servicio, `/rest/v1/visita?anotaciones_ingreso=eq.${encodeURIComponent(`${MARCA_PRUEBA} permisos por rol`)}`, { metodo: "DELETE" });
  await api(servicio, `/rest/v1/publicacion?titulo=like.${encodeURIComponent(`${MARCA_PRUEBA} permisos%`)}`, { metodo: "DELETE" });
  await api(servicio, `/rest/v1/zona_comun?nombre=like.${encodeURIComponent(`${MARCA_PRUEBA} permisos%`)}`, { metodo: "DELETE" });
  await api(servicio, `/rest/v1/invitacion?correo=like.${encodeURIComponent("invitado-permisos%")}`, { metodo: "DELETE" });
  await zona?.retirar();
  for (const id of cuentas) {
    await fetch(`${URL}/rest/v1/membresia_unidad?usuario_id=eq.${id}`, { method: "DELETE", headers: cabeceras });
    await fetch(`${URL}/rest/v1/membresia_condominio?usuario_id=eq.${id}`, { method: "DELETE", headers: cabeceras });
    await fetch(`${URL}/auth/v1/admin/users/${id}`, { method: "DELETE", headers: cabeceras });
  }
  await retirarDueno?.();
});

describe("quién cambia los permisos", () => {
  it("la administración de un edificio, no", async () => {
    const marcela = await entrar(CUENTA.admin);
    const r = await rpc(marcela, "panel_cambiar_permiso_de_rol", {
      p_condominio_id: null,
      p_rol: "residente",
      p_accion: "registrar_visitas",
      p_permitido: false,
    });
    expect(r.estado).toBe(403);
    expect(JSON.stringify(r.datos)).toMatch(/Solo el dueño/);
  });

  it("el dueño de la plataforma, sí", async () => {
    const r = await cambiar("residente", "registrar_visitas", true);
    expect(r.estado).toBe(204);
  });
});

describe("registrar visitas, para el residente", () => {
  it("con el permiso (control), registra", async () => {
    const r = await visitaDe(residente);
    expect(r.estado).toBe(201);
  });

  it("sin el permiso general, no; y dice por qué", async () => {
    await cambiar("residente", "registrar_visitas", false);
    const r = await visitaDe(residente);
    expect(fueRechazada(r)).toBe(true);
    expect(r.mensaje).toMatch(/no puede registrar visitas/);
  });

  it("la excepción del edificio manda sobre la regla general", async () => {
    await cambiar("residente", "registrar_visitas", true, CONDOMINIO);
    const r = await visitaDe(residente);
    expect(r.estado).toBe(201);
  });

  it("quitar la excepción vuelve a la regla general", async () => {
    await cambiar("residente", "registrar_visitas", null, CONDOMINIO);
    const r = await visitaDe(residente);
    expect(fueRechazada(r)).toBe(true);
    await cambiar("residente", "registrar_visitas", true);
  });
});

describe("reservar zonas, para el residente", () => {
  it("sin el permiso, no reserva", async () => {
    await cambiar("residente", "reservar_zonas", false);
    const r = await insertar(residente, "reserva_zona", {
      zona_id: zona.id,
      unidad_id: UNIDAD.u205,
      fecha: fechaEnDias(40),
      hora_inicio: "10:00",
      hora_fin: "11:00",
      solicitada_por: residente.usuarioId,
      comentarios: `${MARCA_PRUEBA} permisos`,
    });
    expect(fueRechazada(r)).toBe(true);
    expect(r.mensaje).toMatch(/no puede reservar zonas/);
    await cambiar("residente", "reservar_zonas", true);
  });
});

describe("invitar a la vivienda, para el residente", () => {
  const invitar = () =>
    rpc(residente, "crear_invitacion", {
      p_condominio_id: CONDOMINIO,
      p_ambito: "unidad",
      p_correo: `invitado-permisos-${Date.now().toString(36)}@veciyo.test`,
      p_nombre: "Invitado de prueba",
      p_unidad_id: UNIDAD.u205,
      p_rol_unidad: "corresidente",
    });

  it("por defecto, no invita", async () => {
    const r = await invitar();
    expect(fueRechazada(r)).toBe(true);
  });

  it("si el dueño se lo permite, invita", async () => {
    await cambiar("residente", "invitar_a_la_vivienda", true);
    const r = await invitar();
    expect(r.estado).toBe(200);
    await cambiar("residente", "invitar_a_la_vivienda", false);
  });
});

describe("el coadministrador del edificio", () => {
  it("con el permiso (control), crea una zona", async () => {
    const r = await insertar(coadmin, "zona_comun?select=id", {
      condominio_id: CONDOMINIO,
      nombre: `${MARCA_PRUEBA} permisos zona`,
      activa: false,
    });
    expect(r.estado).toBe(201);
  });

  it("sin el permiso de zonas, no", async () => {
    await cambiar("coadministrador_edificio", "crear_zonas", false);
    const r = await insertar(coadmin, "zona_comun", {
      condominio_id: CONDOMINIO,
      nombre: `${MARCA_PRUEBA} permisos zona 2`,
      activa: false,
    });
    expect(fueRechazada(r)).toBe(true);
    expect(r.mensaje).toMatch(/no puedes crear ni editar zonas/);
    await cambiar("coadministrador_edificio", "crear_zonas", true);
  });

  it("sin el permiso de anuncios, no publica", async () => {
    await cambiar("coadministrador_edificio", "crear_anuncios", false);
    const r = await insertar(coadmin, "publicacion", {
      condominio_id: CONDOMINIO,
      categoria: "administracion",
      titulo: `${MARCA_PRUEBA} permisos anuncio`,
      tipo: "anuncio",
      creada_por: coadmin.usuarioId,
    });
    expect(fueRechazada(r)).toBe(true);
    expect(r.mensaje).toMatch(/no puedes publicar anuncios/);
    await cambiar("coadministrador_edificio", "crear_anuncios", true);
  });
});
