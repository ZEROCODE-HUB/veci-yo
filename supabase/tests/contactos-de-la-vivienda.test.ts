import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  CLAVE_SERVICIO,
  CUENTA,
  UNIDAD,
  actualizar,
  entrar,
  leer,
  rpc,
  type Sesion,
} from "./apoyo";

/**
 * A quién llamar en una vivienda (huecos 11 y 20).
 *
 * `contactos_de_la_vivienda` junta el teléfono, si la persona acepta WhatsApp
 * y chat, su contacto de emergencia y su contacto alternativo. Es lo que ve
 * la administración y la portería en el directorio de propiedades, y solo
 * ellas: un vecino no tiene por qué saber el contacto de emergencia del de al
 * lado.
 *
 * Se trae sus datos: le pone a Sofía (102) WhatsApp, un contacto de emergencia
 * y uno alternativo, y le devuelve la fila cruda al terminar.
 */

const servicio: Sesion = { token: CLAVE_SERVICIO, usuarioId: "", correo: "" };

let membresia: Record<string, unknown> & { id: string };
let perfil: Record<string, unknown> & { id: string };

beforeAll(async () => {
  const sofia = await entrar(CUENTA.vecino);
  const m = await leer(
    servicio,
    `membresia_unidad?unidad_id=eq.${UNIDAD.u102}&usuario_id=eq.${sofia.usuarioId}&activo=eq.true&select=id,contactable_whatsapp,contactable_chat,contacto_emergencia_nombre,contacto_emergencia_codigo,contacto_emergencia_telefono,telefono,codigo_pais`,
  );
  membresia = m.datos[0];
  const p = await leer(
    servicio,
    `perfil?id=eq.${sofia.usuarioId}&select=id,usar_contacto_alt,telefono_alt,correo_alt,codigo_pais_alt`,
  );
  perfil = p.datos[0];

  const r1 = await actualizar(servicio, `membresia_unidad?id=eq.${membresia.id}`, {
    contactable_whatsapp: true,
    contactable_chat: true,
    telefono: "3105551001",
    codigo_pais: "CO",
    contacto_emergencia_nombre: "Hermana de Sofía",
    contacto_emergencia_codigo: "CO",
    contacto_emergencia_telefono: "3009998877",
  });
  expect(r1.estado).toBe(200);
  const r2 = await actualizar(servicio, `perfil?id=eq.${perfil.id}`, {
    usar_contacto_alt: true,
    telefono_alt: "3001112233",
    codigo_pais_alt: "CO",
    correo_alt: "sofia.alterno@veciyo.test",
  });
  expect(r2.estado).toBe(200);
});

afterAll(async () => {
  const { id: idM, ...restoM } = membresia;
  const { id: idP, ...restoP } = perfil;
  const r1 = await actualizar(servicio, `membresia_unidad?id=eq.${idM}`, restoM);
  const r2 = await actualizar(servicio, `perfil?id=eq.${idP}`, restoP);
  if (r1.estado !== 200 || r2.estado !== 200) throw new Error("No se pudo devolver a Sofía como estaba");
});

const deSofia = (filas: any[]) => filas.find((f) => f.membresia_id === membresia.id);

describe("quién ve a quién llamar", () => {
  it("la administración ve teléfono, WhatsApp, chat, emergencia y alternativo", async () => {
    const marcela = await entrar(CUENTA.admin);
    const r = await rpc(marcela, "contactos_de_la_vivienda", { p_unidad_id: UNIDAD.u102 });
    expect(r.estado).toBe(200);
    const sofia = deSofia(r.datos);
    expect(sofia.whatsapp).toBe(true);
    expect(sofia.chat).toBe(true);
    expect(sofia.emergencia_telefono).toBe("3009998877");
    expect(sofia.alterno_telefono).toBe("3001112233");
    expect(sofia.alterno_correo).toBe("sofia.alterno@veciyo.test");
  });

  it("la portería también", async () => {
    const guardia = await entrar(CUENTA.guardia);
    const r = await rpc(guardia, "contactos_de_la_vivienda", { p_unidad_id: UNIDAD.u102 });
    expect(r.estado).toBe(200);
    expect(deSofia(r.datos).emergencia_nombre).toBe("Hermana de Sofía");
  });

  it("un vecino de otra vivienda, no", async () => {
    const guillermo = await entrar(CUENTA.propietario);
    const r = await rpc(guillermo, "contactos_de_la_vivienda", { p_unidad_id: UNIDAD.u102 });
    expect(r.estado).toBeGreaterThanOrEqual(400);
    expect(JSON.stringify(r.datos)).toMatch(/Solo la administración y la portería/);
  });

  it("ni la administración de otro edificio", async () => {
    const ajena = await entrar(CUENTA.adminAjeno);
    const r = await rpc(ajena, "contactos_de_la_vivienda", { p_unidad_id: UNIDAD.u102 });
    expect(r.estado).toBeGreaterThanOrEqual(400);
  });
});

describe("lo que la persona eligió", () => {
  it("sin el contacto alternativo encendido, no sale", async () => {
    await actualizar(servicio, `perfil?id=eq.${perfil.id}`, { usar_contacto_alt: false });
    const marcela = await entrar(CUENTA.admin);
    const r = await rpc(marcela, "contactos_de_la_vivienda", { p_unidad_id: UNIDAD.u102 });
    const sofia = deSofia(r.datos);
    expect(sofia.alterno_telefono).toBeNull();
    expect(sofia.alterno_correo).toBeNull();
    await actualizar(servicio, `perfil?id=eq.${perfil.id}`, { usar_contacto_alt: true });
  });

  it("sin aceptar WhatsApp, no se ofrece", async () => {
    await actualizar(servicio, `membresia_unidad?id=eq.${membresia.id}`, { contactable_whatsapp: false });
    const marcela = await entrar(CUENTA.admin);
    const r = await rpc(marcela, "contactos_de_la_vivienda", { p_unidad_id: UNIDAD.u102 });
    expect(deSofia(r.datos).whatsapp).toBe(false);
    expect(deSofia(r.datos).telefono).toBe("3105551001");
  });
});
