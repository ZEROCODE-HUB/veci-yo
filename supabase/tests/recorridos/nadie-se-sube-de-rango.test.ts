import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { entrarComo, salir, servicio, supabase } from "./cliente";

/**
 * Recorrido: nadie se sube de rango por detrás (15/10/2026).
 *
 * La revisión de permisos de la base contra las pantallas encontró cuatro
 * caminos para ganar un rol que nadie te dio. Ninguno se ve desde la app: se
 * hacen llamando a la base con la sesión propia, que es justo lo que esta
 * prueba hace.
 *
 *   1. Reescribir una invitación que uno emitió (rol, vivienda) y aceptarla.
 *   2. Cambiarse de vivienda editando la membresía propia.
 *   3. Un coadministrador con el permiso de seguridad haciéndose administrador
 *      o desactivando al administrador.
 *   4. Un coadministrador invitando a un administrador o a otro coadministrador
 *      (el cliente decidió que no: 15/10/2026).
 */

const CONDOMINIO = "11111111-1111-1111-1111-111111111111";
const U102 = "44444444-4444-4444-4444-444444444443";
const ADMIN = "admin@veciyo.test"; // Marcela, administradora
const ANFITRIONA = "vecino@veciyo.test"; // Sofía, 102
const HUESPED = "nuevo.inquilino@veciyo.test"; // Tomás, alojado en la 102
const GUARDIA = "guardia@veciyo.test"; // Juan
/** Una cuenta sin rol, que aquí hace de coadministradora. */
const COADMIN = "invitado.prueba@veciyo.test";
const MARCA = "[prueba] nadie se sube de rango";

let coadminId = "";
let coadminMembresia = "";
let membresiaAdmin = "";
let membresiaGuardia = "";
let membresiaHuesped = "";
let otraVivienda = "";
const invitaciones: string[] = [];

async function idDe(correo: string): Promise<string> {
  const id = await entrarComo(correo);
  await salir();
  return id;
}

beforeAll(async () => {
  coadminId = await idDe(COADMIN);
  await servicio.from("membresia_condominio").delete().like("nombre", `${MARCA}%`);
  const { data: alta, error } = await servicio
    .from("membresia_condominio")
    .insert({
      condominio_id: CONDOMINIO,
      usuario_id: coadminId,
      rol: "coadministrador",
      nombre: `${MARCA} coadmin`,
      permisos: { modificarSeguridad: true, actualizarResidentes: true },
    })
    .select("id")
    .single();
  if (error) throw error;
  coadminMembresia = alta.id;

  const adminId = await idDe(ADMIN);
  const guardiaId = await idDe(GUARDIA);
  const huespedId = await idDe(HUESPED);
  membresiaAdmin = (
    await servicio
      .from("membresia_condominio")
      .select("id")
      .eq("condominio_id", CONDOMINIO)
      .eq("usuario_id", adminId)
      .eq("rol", "administrador")
      .single()
  ).data!.id;
  membresiaGuardia = (
    await servicio
      .from("membresia_condominio")
      .select("id")
      .eq("condominio_id", CONDOMINIO)
      .eq("usuario_id", guardiaId)
      .eq("rol", "guardia")
      .limit(1)
      .single()
  ).data!.id;
  membresiaHuesped = (
    await servicio
      .from("membresia_unidad")
      .select("id")
      .eq("unidad_id", U102)
      .eq("usuario_id", huespedId)
      .limit(1)
      .single()
  ).data!.id;
  otraVivienda = (
    await servicio
      .from("unidad")
      .select("id, torre!inner(condominio_id)")
      .eq("torre.condominio_id", CONDOMINIO)
      .neq("id", U102)
      .limit(1)
      .single()
  ).data!.id;
});

afterAll(async () => {
  await salir();
  if (invitaciones.length) await servicio.from("invitacion").delete().in("id", invitaciones);
  await servicio.from("invitacion").delete().like("nombre", `${MARCA}%`);
  await servicio.from("membresia_condominio").delete().eq("id", coadminMembresia);
});

describe("una invitación emitida", () => {
  let invitacionId = "";

  beforeAll(async () => {
    await entrarComo(ANFITRIONA);
    const { data, error } = await supabase.rpc("crear_invitacion", {
      p_condominio_id: CONDOMINIO,
      p_ambito: "unidad",
      p_correo: "rango.prueba@veciyo.test",
      p_nombre: `${MARCA} residente`,
      p_unidad_id: U102,
      p_rol_unidad: "residente",
    });
    await salir();
    if (error) throw error;
    invitacionId = (data as { invitacion_id: string }[])[0].invitacion_id;
    invitaciones.push(invitacionId);
  });

  it("no se convierte en una de propietario", async () => {
    await entrarComo(ANFITRIONA);
    const { error } = await supabase
      .from("invitacion")
      .update({ rol_unidad: "propietario" })
      .eq("id", invitacionId);
    await salir();
    expect(error?.message).toMatch(/no se puede modificar/);
  });

  it("ni en una de administrador del edificio", async () => {
    await entrarComo(ANFITRIONA);
    const { error } = await supabase
      .from("invitacion")
      .update({ ambito: "condominio", rol_condominio: "administrador", unidad_id: null, rol_unidad: null })
      .eq("id", invitacionId);
    await salir();
    expect(error).not.toBeNull();
    const { data } = await servicio
      .from("invitacion")
      .select("ambito, rol_unidad")
      .eq("id", invitacionId)
      .single();
    expect(data).toEqual({ ambito: "unidad", rol_unidad: "residente" });
  });

  it("pero sí se revoca", async () => {
    await entrarComo(ANFITRIONA);
    const { error } = await supabase
      .from("invitacion")
      .update({ estado: "revocada" })
      .eq("id", invitacionId);
    await salir();
    expect(error).toBeNull();
  });
});

describe("una membresía de vivienda", () => {
  it("no se muda a otra vivienda", async () => {
    await entrarComo(HUESPED);
    const { error } = await supabase
      .from("membresia_unidad")
      .update({ unidad_id: otraVivienda })
      .eq("id", membresiaHuesped);
    await salir();
    expect(error?.message).toMatch(/no se cambia de vivienda/);
    const { data } = await servicio
      .from("membresia_unidad")
      .select("unidad_id")
      .eq("id", membresiaHuesped)
      .single();
    expect(data!.unidad_id).toBe(U102);
  });
});

describe("un coadministrador con el permiso de seguridad", () => {
  it("no se hace administrador", async () => {
    await entrarComo(COADMIN);
    const { error } = await supabase
      .from("membresia_condominio")
      .update({ rol: "administrador" })
      .eq("id", coadminMembresia);
    await salir();
    expect(error?.message).toMatch(/Solo el administrador/);
  });

  it("no desactiva al administrador", async () => {
    await entrarComo(COADMIN);
    const { error } = await supabase
      .from("membresia_condominio")
      .update({ activo: false })
      .eq("id", membresiaAdmin);
    await salir();
    expect(error?.message).toMatch(/Solo el administrador/);
    const { data } = await servicio
      .from("membresia_condominio")
      .select("activo")
      .eq("id", membresiaAdmin)
      .single();
    expect(data!.activo).toBe(true);
  });

  it("sí gestiona a la portería", async () => {
    const { data: antes } = await servicio
      .from("membresia_condominio")
      .select("telefono")
      .eq("id", membresiaGuardia)
      .single();
    await entrarComo(COADMIN);
    const { error } = await supabase
      .from("membresia_condominio")
      .update({ telefono: antes!.telefono })
      .eq("id", membresiaGuardia);
    await salir();
    expect(error).toBeNull();
  });
});

describe("un coadministrador invitando", () => {
  async function invitar(rol: "administrador" | "coadministrador" | "guardia") {
    await entrarComo(COADMIN);
    const r = await supabase.rpc("crear_invitacion", {
      p_condominio_id: CONDOMINIO,
      p_ambito: "condominio",
      p_correo: `rango.${rol}@veciyo.test`,
      p_nombre: `${MARCA} ${rol}`,
      p_rol_condominio: rol,
    });
    await salir();
    const fila = (r.data as { invitacion_id: string }[] | null)?.[0];
    if (fila) invitaciones.push(fila.invitacion_id);
    return r.error;
  }

  it("no invita a un administrador", async () => {
    expect((await invitar("administrador"))?.message).toMatch(/Solo el administrador puede invitar/);
  });

  it("ni a otro coadministrador", async () => {
    expect((await invitar("coadministrador"))?.message).toMatch(/Solo el administrador puede invitar/);
  });

  it("sí a un guardia, con el permiso de seguridad", async () => {
    expect(await invitar("guardia")).toBeNull();
  });
});

describe("el administrador", () => {
  it("sigue gestionando a los coadministradores", async () => {
    await entrarComo(ADMIN);
    const { error } = await supabase
      .from("membresia_condominio")
      .update({ permisos: { modificarSeguridad: true, actualizarResidentes: false } })
      .eq("id", coadminMembresia);
    await salir();
    expect(error).toBeNull();
  });
});
