import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { entrarComo, salir, servicio, supabase } from "./cliente";
import { agregarPersonaSinApp } from "@/features/propietario/services/invitacionesUnidad.repo";

/**
 * Recorrido: quién vive en cada vivienda, más claro (17/11/2026, plan
 * aprobado por el cliente).
 *
 *   · Un residente puede no usar la app --un niño, un abuelo--: lo anota quien
 *     puede invitar a la vivienda (`agregar_persona_sin_app`), sin correo ni
 *     cuenta. Una vecina de otra vivienda no puede, y donde se alquila por
 *     noches no hay residentes.
 *   · «Darle acceso a la app» después: la invitación lleva su membresía y, al
 *     aceptarla, la cuenta se une a **esa misma fila**, sin duplicar a nadie.
 *   · El anfitrión (`coadministrador` de vivienda) se invita y se acepta,
 *     también donde se alquila por noches: es quien atiende esa renta.
 *   · Ya no quedan corresidentes activos: pasaron a residente.
 *
 * Las cuentas que aceptan son de este recorrido, de usar y tirar.
 */

const CONDOMINIO = "11111111-1111-1111-1111-111111111111";
const U101 = "44444444-4444-4444-4444-444444444441"; // de Guillermo, para vivir
const U102 = "44444444-4444-4444-4444-444444444443"; // de la vecina, se alquila por noches
const DUENO_101 = "propietario@veciyo.test";
const VECINA = "vecino@veciyo.test";
const CLAVE = "Prueba123!";
const MARCA = "[prueba] Personas de la vivienda";

const marca = Date.now();
const CORREO_ACCESO = `dar.acceso.${marca}@veciyo.test`;
const CORREO_ANFITRION = `anfitrion.${marca}@veciyo.test`;

const cuentas: string[] = [];
const membresias: string[] = [];
const invitaciones: string[] = [];

async function cuentaDeUsarYTirar(correo: string) {
  const { data, error } = await servicio.auth.admin.createUser({
    email: correo,
    password: CLAVE,
    email_confirm: true,
  });
  if (error) throw new Error(`No se pudo crear ${correo}: ${error.message}`);
  cuentas.push(data.user.id);
  const { error: errorPerfil } = await servicio
    .from("perfil")
    .upsert({ id: data.user.id, nombre: `${MARCA}`, apellido: "De Prueba" });
  if (errorPerfil) throw new Error(errorPerfil.message);
  return data.user.id;
}

beforeAll(async () => {
  // Lo que dejó una corrida interrumpida, antes de crear nada.
  const { error } = await servicio.from("membresia_unidad").delete().like("nombre", `${MARCA}%`);
  if (error) throw new Error(`No se pudo limpiar lo de antes: ${error.message}`);
});

afterAll(async () => {
  await salir();
  if (invitaciones.length) {
    const { error } = await servicio.from("invitacion").delete().in("id", invitaciones);
    if (error) throw new Error(`No se pudieron borrar las invitaciones: ${error.message}`);
  }
  for (const id of membresias) {
    const { error } = await servicio.from("membresia_unidad").delete().eq("id", id);
    if (error) throw new Error(`No se pudo borrar la membresía: ${error.message}`);
  }
  for (const id of cuentas) {
    await servicio.from("perfil").delete().eq("id", id);
    const { error } = await servicio.auth.admin.deleteUser(id);
    if (error) throw new Error(`No se pudo borrar la cuenta: ${error.message}`);
  }
});

describe("anotar a alguien que no usará la app", () => {
  it("el dueño anota a un menor, sin cuenta y con su documento", async () => {
    await entrarComo(DUENO_101);
    const id = await agregarPersonaSinApp({
      unidadId: U101,
      nombre: `${MARCA} Tomasito`,
      tipoDocumento: "tarjeta_identidad",
      documento: "1012345678",
      esMenor: true,
    });
    membresias.push(id);
    await salir();

    const { data, error } = await servicio
      .from("membresia_unidad")
      .select("rol, usuario_id, puede_acceder, es_menor, es_residente, activo, tipo_documento, documento")
      .eq("id", id)
      .single();
    expect(error).toBeNull();
    expect(data).toMatchObject({
      rol: "residente",
      usuario_id: null,
      puede_acceder: false,
      es_menor: true,
      es_residente: true,
      activo: true,
      tipo_documento: "tarjeta_identidad",
      documento: "1012345678",
    });
  });

  it("una vecina de otra vivienda no puede anotar a nadie en la 101", async () => {
    await entrarComo(VECINA);
    await expect(
      agregarPersonaSinApp({ unidadId: U101, nombre: `${MARCA} Intruso`, esMenor: false }),
    ).rejects.toThrow(/no tienes permiso/i);
    await salir();
    const { count } = await servicio
      .from("membresia_unidad")
      .select("id", { count: "exact", head: true })
      .eq("nombre", `${MARCA} Intruso`);
    expect(count).toBe(0);
  });

  it("en la 102, que se alquila por noches, no hay residentes; ni aunque la anote su dueña", async () => {
    await entrarComo(VECINA);
    await expect(
      agregarPersonaSinApp({ unidadId: U102, nombre: `${MARCA} Abuela`, esMenor: false }),
    ).rejects.toThrow(/se alquila por noches/i);
    await salir();
  });
});

describe("darle acceso a la app después", () => {
  let membresiaId = "";
  let invitacionId = "";
  let token = "";

  it("el dueño le manda la invitación a quien vive sin la app", async () => {
    await entrarComo(DUENO_101);
    membresiaId = await agregarPersonaSinApp({
      unidadId: U101,
      nombre: `${MARCA} Rosa`,
      esMenor: false,
    });
    membresias.push(membresiaId);
    const { data, error } = await supabase.rpc("dar_acceso_a_la_app", {
      p_membresia_id: membresiaId,
      p_correo: CORREO_ACCESO,
    });
    await salir();
    expect(error).toBeNull();
    const fila = Array.isArray(data) ? data[0] : data;
    invitacionId = fila?.invitacion_id ?? "";
    token = fila?.token ?? "";
    if (invitacionId) invitaciones.push(invitacionId);

    const { data: inv } = await servicio
      .from("invitacion")
      .select("rol_unidad, unidad_id, membresia_unidad_id, estado")
      .eq("id", invitacionId)
      .single();
    expect(inv).toMatchObject({
      rol_unidad: "residente",
      unidad_id: U101,
      membresia_unidad_id: membresiaId,
      estado: "pendiente",
    });
  });

  it("a un menor no se le puede dar cuenta", async () => {
    await entrarComo(DUENO_101);
    const { error } = await supabase.rpc("dar_acceso_a_la_app", {
      p_membresia_id: membresias[0],
      p_correo: `menor.${marca}@veciyo.test`,
    });
    await salir();
    expect(error?.message).toMatch(/menor de edad/i);
  });

  it("al aceptarla queda unida a la misma persona, sin duplicarla", async () => {
    const usuario = await cuentaDeUsarYTirar(CORREO_ACCESO);
    await entrarComo(CORREO_ACCESO);
    const { data: unida, error } = await supabase.rpc("aceptar_invitacion", { p_token: token });
    await salir();
    expect(error).toBeNull();
    expect(unida).toBe(membresiaId);

    const { data: suyas } = await servicio
      .from("membresia_unidad")
      .select("id, usuario_id, puede_acceder")
      .eq("unidad_id", U101)
      .eq("usuario_id", usuario);
    const { data: conSuNombre } = await servicio
      .from("membresia_unidad")
      .select("id")
      .eq("unidad_id", U101)
      .eq("nombre", `${MARCA} Rosa`);
    for (const f of [...(suyas ?? []), ...(conSuNombre ?? [])])
      if (!membresias.includes(f.id)) membresias.push(f.id);
    expect(suyas).toHaveLength(1);
    expect(conSuNombre).toHaveLength(1);
    expect(suyas![0]).toMatchObject({ id: membresiaId, usuario_id: usuario, puede_acceder: true });
  });
});

describe("el anfitrión", () => {
  it("la dueña de la 102 lo invita y la renta corta no lo frena; al aceptar queda de anfitrión", async () => {
    // Control positivo de la prueba de la 102 de arriba: la vecina sí puede
    // invitar en su vivienda; lo que frena al residente es la renta corta.
    await entrarComo(VECINA);
    const { data, error } = await supabase.rpc("crear_invitacion", {
      p_condominio_id: CONDOMINIO,
      p_ambito: "unidad",
      p_correo: CORREO_ANFITRION,
      p_nombre: `${MARCA} Anfitrión`,
      p_unidad_id: U102,
      p_rol_unidad: "coadministrador",
    });
    await salir();
    expect(error).toBeNull();
    const fila = Array.isArray(data) ? data[0] : data;
    invitaciones.push(fila.invitacion_id);

    const usuario = await cuentaDeUsarYTirar(CORREO_ANFITRION);
    await entrarComo(CORREO_ANFITRION);
    const { data: membresia, error: errorAceptar } = await supabase.rpc("aceptar_invitacion", {
      p_token: fila.token,
    });
    await salir();
    expect(errorAceptar).toBeNull();
    if (membresia) membresias.push(membresia as string);

    const { data: m } = await servicio
      .from("membresia_unidad")
      .select("rol, usuario_id, activo")
      .eq("id", membresia as string)
      .single();
    expect(m).toMatchObject({ rol: "coadministrador", usuario_id: usuario, activo: true });
  });
});

describe("sin corresidentes", () => {
  it("no queda ninguno activo", async () => {
    const { count, error } = await servicio
      .from("membresia_unidad")
      .select("id", { count: "exact", head: true })
      .eq("rol", "corresidente")
      .eq("activo", true);
    expect(error).toBeNull();
    expect(count).toBe(0);
  });
});
