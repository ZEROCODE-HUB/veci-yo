import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { entrarComo, salir, servicio, supabase } from "./cliente";
import { responderInvitacionDeLaVivienda } from "@/features/home/services/misInvitaciones.repo";

/**
 * Recorrido: con inquilino líder, el propietario pasa a «no residente»
 * (17/11/2026, plan «quién vive en cada vivienda», punto 5).
 *
 * El inquilino líder alquila la vivienda entera: quien vive ahí es él. Al
 * quedar activo, el disparador
 * `membresia_unidad_inquilino_lider_propietario_no_reside` marca como no
 * residentes a los propietarios de esa vivienda y les deja un aviso.
 *
 *   · Negativo, con su control: que entre una **residente** no cambia nada
 *     al propietario (sigue residente, sin aviso).
 *   · Positivo: que entre un **inquilino líder** lo pasa a no residente y el
 *     propietario ve el aviso con su sesión.
 *
 * La 205 es de Guillermo y está marcada residente. Las dos cuentas que entran
 * son de usar y tirar, y entran por el camino de la app: el propietario las
 * invita y ellas aceptan desde Inicio. La fila de Guillermo se guarda cruda y
 * se devuelve tal cual al terminar.
 */

const CONDOMINIO = "11111111-1111-1111-1111-111111111111";
const U205 = "44444444-4444-4444-4444-444444444442";
const DUENO = "propietario@veciyo.test";
const CLAVE = "Prueba123!";
const MARCA = "[prueba] Inquilino líder";

const marca = Date.now();
const correoResidente = `residente.205.${marca}@veciyo.test`;
const correoInquilino = `inquilino.205.${marca}@veciyo.test`;

let duenoId = "";
let filaDelDueno: { id: string; es_residente: boolean } | null = null;
const cuentas: string[] = [];
const invitaciones: string[] = [];
const membresias: string[] = [];
const avisos: string[] = [];
/**
 * Los inquilinos líderes que ya había en la 205 (Laura, de las personas de
 * prueba). Desde el 17/11/2026, con uno activo el dueño no vuelve a ser
 * residente, y la prueba lo necesita residente: se apartan y se devuelven.
 */
let apartados: string[] = [];
let desde = "";

async function crearCuenta(correo: string, nombre: string) {
  const { data, error } = await servicio.auth.admin.createUser({ email: correo, password: CLAVE, email_confirm: true });
  if (error) throw new Error(`No se pudo crear ${correo}: ${error.message}`);
  cuentas.push(data.user.id);
  const { error: e } = await servicio.from("perfil").upsert({ id: data.user.id, nombre, apellido: "Prueba" });
  if (e) throw new Error(e.message);
  return data.user.id;
}

/** El propietario invita y la cuenta acepta en Inicio, como en la app. */
async function entraALa205(correo: string, rol: "residente" | "inquilino_lider", usuarioId: string) {
  await entrarComo(DUENO);
  const { data, error } = await supabase.rpc("crear_invitacion", {
    p_condominio_id: CONDOMINIO,
    p_ambito: "unidad",
    p_correo: correo,
    p_nombre: `${MARCA} ${rol}`,
    p_unidad_id: U205,
    p_rol_unidad: rol,
  });
  await salir();
  if (error) throw new Error(`crear_invitacion: ${error.message}`);
  const fila = Array.isArray(data) ? data[0] : data;
  invitaciones.push(fila.invitacion_id as string);

  await entrarComo(correo);
  await responderInvitacionDeLaVivienda(fila.invitacion_id as string, true);
  await salir();

  const { data: m, error: em } = await servicio
    .from("membresia_unidad")
    .select("id, rol, activo")
    .eq("unidad_id", U205)
    .eq("usuario_id", usuarioId)
    .single();
  if (em) throw new Error(`membresía de ${correo}: ${em.message}`);
  membresias.push(m.id);
  expect(m).toMatchObject({ rol, activo: true });
}

async function filaDeGuillermo() {
  const { data, error } = await servicio
    .from("membresia_unidad")
    .select("id, es_residente")
    .eq("unidad_id", U205)
    .eq("usuario_id", duenoId)
    .eq("rol", "propietario")
    .single();
  if (error) throw new Error(error.message);
  return data;
}

/** Los avisos de residencia que Guillermo ve **con su sesión** desde que empezó la prueba. */
async function susAvisos() {
  await entrarComo(DUENO);
  const { data, error } = await supabase
    .from("notificacion")
    .select("id, mensaje")
    .eq("tipo", "residencia_cambiada")
    .eq("entidad_id", U205)
    .like("mensaje", `${MARCA}%`)
    .gte("created_at", desde);
  await salir();
  if (error) throw new Error(error.message);
  return data ?? [];
}

beforeAll(async () => {
  duenoId = await entrarComo(DUENO);
  await salir();
  filaDelDueno = await filaDeGuillermo();
  const { data: otros, error: errorOtros } = await servicio
    .from("membresia_unidad")
    .update({ activo: false })
    .eq("unidad_id", U205)
    .eq("rol", "inquilino_lider")
    .eq("activo", true)
    .select("id");
  if (errorOtros) throw new Error(errorOtros.message);
  apartados = (otros ?? []).map((o) => o.id);
  // La prueba necesita al dueño residente; si una corrida anterior lo dejó
  // como no residente, se pone aquí y se devuelve lo que había.
  if (!filaDelDueno.es_residente) {
    const { error } = await servicio.from("membresia_unidad").update({ es_residente: true }).eq("id", filaDelDueno.id);
    if (error) throw new Error(error.message);
  }
  // Con margen: los avisos se fechan con el reloj de la base, no el de la máquina.
  desde = new Date(Date.now() - 5 * 60_000).toISOString();
});

afterAll(async () => {
  await salir();
  const { data: suyos } = await servicio
    .from("notificacion")
    .select("id")
    .eq("usuario_id", duenoId)
    .eq("tipo", "residencia_cambiada")
    .like("mensaje", `${MARCA}%`);
  avisos.push(...(suyos ?? []).map((a) => a.id));
  if (avisos.length) {
    const { error } = await servicio.from("notificacion").delete().in("id", avisos);
    if (error) throw new Error(`No se pudieron borrar los avisos: ${error.message}`);
  }
  for (const id of membresias) {
    const { error } = await servicio.from("membresia_unidad").delete().eq("id", id);
    if (error) throw new Error(`No se pudo borrar la membresía: ${error.message}`);
  }
  if (invitaciones.length) {
    const { error } = await servicio.from("invitacion").delete().in("id", invitaciones);
    if (error) throw new Error(`No se pudieron borrar las invitaciones: ${error.message}`);
  }
  if (filaDelDueno) {
    const { error } = await servicio
      .from("membresia_unidad")
      .update({ es_residente: filaDelDueno.es_residente })
      .eq("id", filaDelDueno.id);
    if (error) throw new Error(`No se pudo devolver la fila del dueño: ${error.message}`);
    const vuelta = await filaDeGuillermo();
    if (vuelta.es_residente !== filaDelDueno.es_residente) throw new Error("La fila del dueño no quedó como estaba");
  }
  // Los inquilinos líderes apartados vuelven. Al volver, el disparador marca
  // otra vez al dueño no residente y le deja un aviso: el aviso se retira.
  if (apartados.length) {
    const { error } = await servicio.from("membresia_unidad").update({ activo: true }).in("id", apartados);
    if (error) throw new Error(`No se pudieron devolver los inquilinos líderes: ${error.message}`);
    const { error: errorAviso } = await servicio
      .from("notificacion")
      .delete()
      .eq("usuario_id", duenoId)
      .eq("tipo", "residencia_cambiada")
      .eq("entidad_id", U205)
      .gte("created_at", desde)
      .not("mensaje", "like", `${MARCA}%`);
    if (errorAviso) throw new Error(`No se pudo retirar el aviso de la vuelta: ${errorAviso.message}`);
  }
  for (const id of cuentas) {
    await servicio.from("perfil").delete().eq("id", id);
    const { error } = await servicio.auth.admin.deleteUser(id);
    if (error) throw new Error(`No se pudo borrar la cuenta: ${error.message}`);
  }
});

describe("con inquilino líder, el propietario pasa a no residente", () => {
  it("que entre una residente no le cambia nada al propietario", async () => {
    const id = await crearCuenta(correoResidente, `${MARCA} Residente`);
    await entraALa205(correoResidente, "residente", id);

    expect((await filaDeGuillermo()).es_residente).toBe(true);
    expect(await susAvisos()).toHaveLength(0);
  });

  it("que entre un inquilino líder lo marca no residente y se lo avisa", async () => {
    const id = await crearCuenta(correoInquilino, `${MARCA} Luis`);
    await entraALa205(correoInquilino, "inquilino_lider", id);

    expect((await filaDeGuillermo()).es_residente).toBe(false);
    const recibidos = await susAvisos();
    avisos.push(...recibidos.map((a) => a.id));
    expect(recibidos).toHaveLength(1);
    expect(recibidos[0].mensaje).toMatch(
      /^\[prueba\] Inquilino líder Luis Prueba es ahora inquilino líder de .+ · Depto 205\. Te marcamos como no residente; para volver a vivir ahí, primero quita al inquilino líder\.$/,
    );
  });

  /*
    Desde el 17/11/2026 (decisión del cliente) el propietario NO vuelve a ser
    residente mientras el inquilino líder siga activo; quitándolo, sí. Las dos
    mitades: sin la segunda, el rechazo pasaría igual con la regla rota de
    otra forma (por ejemplo, rechazando siempre).
  */
  it("y el propietario no puede volver a declararse residente mientras siga el inquilino líder", async () => {
    await entrarComo(DUENO);
    const { error } = await supabase.rpc("declararse_residente", { p_unidad_id: U205, p_valor: true });
    await salir();
    expect(error?.message).toMatch(/primero quita al inquilino líder/i);
    expect((await filaDeGuillermo()).es_residente).toBe(false);
  });

  it("y quitado el inquilino líder, sí puede", async () => {
    const { error: errorBaja } = await servicio
      .from("membresia_unidad")
      .update({ activo: false })
      .eq("unidad_id", U205)
      .eq("rol", "inquilino_lider")
      .in("id", membresias);
    expect(errorBaja).toBeNull();

    await entrarComo(DUENO);
    const { error } = await supabase.rpc("declararse_residente", { p_unidad_id: U205, p_valor: true });
    await salir();
    expect(error).toBeNull();
    expect((await filaDeGuillermo()).es_residente).toBe(true);
  });
});
