import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { entrarComo, salir, servicio, supabase } from "./cliente";
import { enlaceNuevoDeInvitacion, laInvitacionTieneCuenta } from "@/shared/services/invitaciones";
import {
  obtenerMisInvitacionesDeLaVivienda,
  responderInvitacionDeLaVivienda,
} from "@/features/home/services/misInvitaciones.repo";

/**
 * Recorrido: una sola forma de invitar, igual para todos los roles
 * (16/11/2026, cliente: «lo mejor es que se detecte si el usuario tiene o no
 * cuenta… la app decide si debe crear cuenta o iniciar sesión»).
 *
 *   · `la_invitacion_tiene_cuenta` dice si el correo de **esa** invitación
 *     tiene cuenta, y a nadie más: sin un token válido no responde.
 *   · La invitación a una vivienda (una corresidente de la 301) sale en Inicio de quien
 *     la recibe, y **solo** de quien la recibe; aceptarla crea su rol.
 *   · Un enlace nuevo deja sin valor al anterior, y no lo puede pedir
 *     cualquiera.
 *
 * Las cuentas invitadas son de este recorrido, de usar y tirar: aceptar crea
 * una membresía de verdad y no se hace con una de las cuentas fijas.
 */

const CONDOMINIO = "11111111-1111-1111-1111-111111111111";
// La 301, de Marcela: la 102 se alquila por noches y no admite residentes.
const U301 = "44444444-4444-4444-4444-444444444444";
const ADMIN = "admin@veciyo.test";
const VECINA = "vecino@veciyo.test";
const GUARDIA = "guardia@veciyo.test";
const CLAVE = "Prueba123!";
const MARCA = "[prueba] Una sola forma";

const marca = Date.now();
const CON_CUENTA = `invitar.con.cuenta.${marca}@veciyo.test`;
const SIN_CUENTA = `invitar.sin.cuenta.${marca}@veciyo.test`;

let invitadoId = "";
let conCuenta = { id: "", token: "" };
let sinCuenta = { id: "", token: "" };
const membresias: string[] = [];

async function invitarA(correo: string) {
  const { data, error } = await supabase.rpc("crear_invitacion", {
    p_condominio_id: CONDOMINIO,
    p_ambito: "unidad",
    p_correo: correo,
    p_nombre: `${MARCA} ${correo.split("@")[0]}`,
    p_unidad_id: U301,
    p_rol_unidad: "corresidente",
  });
  if (error) throw error;
  const fila = Array.isArray(data) ? data[0] : data;
  return { id: fila.invitacion_id as string, token: fila.token as string };
}

beforeAll(async () => {
  const { data, error } = await servicio.auth.admin.createUser({
    email: CON_CUENTA,
    password: CLAVE,
    email_confirm: true,
  });
  if (error) throw new Error(`No se pudo crear ${CON_CUENTA}: ${error.message}`);
  invitadoId = data.user.id;
  const { error: errorPerfil } = await servicio
    .from("perfil")
    .upsert({ id: invitadoId, nombre: `${MARCA} invitada`, apellido: "De Prueba" });
  if (errorPerfil) throw new Error(errorPerfil.message);

  await entrarComo(ADMIN);
  conCuenta = await invitarA(CON_CUENTA);
  sinCuenta = await invitarA(SIN_CUENTA);
  await salir();
});

afterAll(async () => {
  await salir();
  for (const id of membresias) {
    const { error } = await servicio.from("membresia_unidad").delete().eq("id", id);
    if (error) throw new Error(`No se pudo borrar la membresía: ${error.message}`);
  }
  const { error: errorInv } = await servicio
    .from("invitacion")
    .delete()
    .in("id", [conCuenta.id, sinCuenta.id].filter(Boolean));
  if (errorInv) throw new Error(`No se pudieron borrar las invitaciones: ${errorInv.message}`);
  if (invitadoId) {
    await servicio.from("perfil").delete().eq("id", invitadoId);
    const { error } = await servicio.auth.admin.deleteUser(invitadoId);
    if (error) throw new Error(`No se pudo borrar la cuenta: ${error.message}`);
  }
});

describe("la app decide entre «Iniciar sesión» y «Crear cuenta»", () => {
  it("con el enlace de quien ya tiene cuenta, dice que sí", async () => {
    expect(await laInvitacionTieneCuenta(conCuenta.token)).toBe(true);
  });

  it("con el enlace de quien no la tiene, dice que no", async () => {
    expect(await laInvitacionTieneCuenta(sinCuenta.token)).toBe(false);
  });

  it("sin un enlace válido no responde nada", async () => {
    expect(await laInvitacionTieneCuenta("no-es-un-token")).toBeNull();
  });
});

describe("la invitación a una vivienda sale en Inicio", () => {
  it("otra persona no la ve ni la puede responder", async () => {
    await entrarComo(GUARDIA);
    const suyas = await obtenerMisInvitacionesDeLaVivienda();
    expect(suyas.some((i) => i.id === conCuenta.id)).toBe(false);
    await expect(responderInvitacionDeLaVivienda(conCuenta.id, true)).rejects.toThrow(
      /ya no está pendiente/i,
    );
    await salir();
  });

  it("quien la recibe la ve, y al aceptarla queda de corresidente", async () => {
    await entrarComo(CON_CUENTA);
    const mias = await obtenerMisInvitacionesDeLaVivienda();
    const esta = mias.find((i) => i.id === conCuenta.id);
    expect(esta).toBeDefined();
    expect(esta!.rol).toBe("corresidente");
    expect(esta!.unidad).toBeTruthy();

    await responderInvitacionDeLaVivienda(conCuenta.id, true);
    const { data: membresia, error } = await supabase
      .from("membresia_unidad")
      .select("id, rol, activo")
      .eq("unidad_id", U301)
      .eq("usuario_id", invitadoId)
      .maybeSingle();
    if (membresia) membresias.push(membresia.id);
    expect(error).toBeNull();
    expect(membresia?.rol).toBe("corresidente");
    expect(membresia?.activo).toBe(true);

    // Aceptada ya no sale, ni se puede volver a aceptar.
    const despues = await obtenerMisInvitacionesDeLaVivienda();
    expect(despues.some((i) => i.id === conCuenta.id)).toBe(false);
    await salir();
  });
});

describe("un enlace nuevo", () => {
  it("no lo puede pedir quien no la emitió ni administra", async () => {
    await entrarComo(GUARDIA);
    await expect(enlaceNuevoDeInvitacion(sinCuenta.id)).rejects.toThrow(/solo quien la emitió/i);
    await salir();
  });

  it("quien la emitió lo pide, y el anterior deja de valer", async () => {
    await entrarComo(ADMIN);
    const nuevo = await enlaceNuevoDeInvitacion(sinCuenta.id);
    await salir();
    expect(nuevo).toMatch(/^[0-9a-f]{64}$/);
    expect(await laInvitacionTieneCuenta(nuevo)).toBe(false);
    expect(await laInvitacionTieneCuenta(sinCuenta.token)).toBeNull();
    sinCuenta = { ...sinCuenta, token: nuevo };
  });
});

describe("el panel de la plataforma", () => {
  it("una vecina no puede pedir las administraciones pendientes", async () => {
    await entrarComo(VECINA);
    const { error } = await supabase.rpc("panel_administraciones_pendientes");
    await salir();
    expect(error?.message).toMatch(/panel de la plataforma/i);
  });
});
