import { createClient } from "@supabase/supabase-js";
import { CLAVE_PRUEBA, CLAVE_SERVICIO, URL } from "./apoyo";

/**
 * Las personas de prueba que la suite necesita, solo mientras corre.
 *
 * El 20/10/2026 el cliente pidió dejar en la base cuatro cuentas (admin@,
 * guardia@, propietario@ y vecino@) y se borraron las demás: los huéspedes
 * Tomás, Ramiro y Nadia, Laura, Rocío, Carla y dos cuentas sin membresía. Unos
 * veinte archivos de prueba entraban con ellas y dejaron de poder arrancar.
 *
 * No se vuelven a sembrar de forma fija: el cliente las vería en la 102 y en
 * sus listas. Se crean al empezar la corrida, **tal como estaban el 20/10**
 * (sacado del respaldo de ese día), y se borran al terminar. Si una corrida
 * muere a medias, la siguiente las encuentra y las deja otra vez en su estado
 * de partida: por eso se borran y se vuelven a escribir sus membresías.
 *
 * Mientras corre la suite, quien mire la 102 verá a estos huéspedes. Es una de
 * las razones para no recorrer la aplicación a la vez que corre (ver AGENTS.md).
 */

const CONDOMINIO = "11111111-1111-1111-1111-111111111111";
const U102 = "44444444-4444-4444-4444-444444444443";
const U205 = "44444444-4444-4444-4444-444444444442";

const COMUNES = { activo: true, puede_acceder: true, datos_visibles: true, contactable_chat: true, contactable_whatsapp: true };

interface Persona {
  correo: string;
  nombre: string;
  apellido: string;
  unidades?: Record<string, unknown>[];
  condominio?: Record<string, unknown>;
}

const PERSONAS: Persona[] = [
  {
    correo: "nuevo.inquilino@veciyo.test", nombre: "Tomás", apellido: "Huésped",
    unidades: [{ unidad_id: U102, nombre: "Tomás Huésped", rol: "huesped_temporal", vigente_desde: "2026-09-22", vigente_hasta: "2030-12-31" }],
  },
  {
    correo: "huesped.pasado@veciyo.test", nombre: "Ramiro", apellido: "Estadía Vencida",
    unidades: [{ unidad_id: U102, nombre: "Ramiro Estadía Vencida", rol: "huesped_temporal", es_residente: true, vigente_desde: "2026-08-01", vigente_hasta: "2026-08-07" }],
  },
  {
    correo: "huesped.futuro@veciyo.test", nombre: "Nadia", apellido: "Llega Pronto",
    unidades: [{ unidad_id: U102, nombre: "Nadia Llega Pronto", rol: "huesped_temporal", es_residente: true, vigente_desde: "2030-06-01", vigente_hasta: "2030-06-08" }],
  },
  {
    correo: "laura.invitada@veciyo.test", nombre: "Laura", apellido: "Gómez Huésped",
    unidades: [
      { unidad_id: U102, nombre: "Laura Gómez", rol: "huesped_temporal", vigente_desde: "2026-09-21", vigente_hasta: "2030-12-31" },
      { unidad_id: U205, nombre: "Laura Gomez", rol: "inquilino_lider", es_residente: true, telefono: "3105551003", codigo_pais: "CO" },
    ],
  },
  {
    correo: "residente@veciyo.test", nombre: "Rocío", apellido: "Residente",
    unidades: [{ unidad_id: U102, nombre: "Rocío Residente", rol: "residente", es_residente: true }],
  },
  {
    correo: "coadmin@veciyo.test", nombre: "Carla", apellido: "Coadmin",
    condominio: { condominio_id: CONDOMINIO, rol: "coadministrador", activo: true, permisos: { contestarChat: false, modificarSeguridad: false } },
  },
  // Sin membresía a propósito: las pruebas las hacen aceptar invitaciones.
  { correo: "invitado.prueba@veciyo.test", nombre: "Invitado", apellido: "De prueba" },
  { correo: "propietario.nuevo@veciyo.test", nombre: "Propietario", apellido: "Nuevo" },
];

const servicio = createClient(URL, CLAVE_SERVICIO, { auth: { persistSession: false } });

async function cuentasExistentes(): Promise<Map<string, string>> {
  const { data, error } = await servicio.auth.admin.listUsers({ perPage: 1000 });
  if (error) throw error;
  return new Map(data.users.map((u) => [u.email ?? "", u.id]));
}

function comprobar(paso: string, error: { message: string } | null) {
  if (error) throw new Error(`personas de prueba · ${paso}: ${error.message}`);
}

export async function setup() {
  const existentes = await cuentasExistentes();

  for (const p of PERSONAS) {
    let id = existentes.get(p.correo);
    if (!id) {
      const { data, error } = await servicio.auth.admin.createUser({
        email: p.correo,
        password: CLAVE_PRUEBA,
        email_confirm: true,
      });
      comprobar(`alta de ${p.correo}`, error);
      id = data.user!.id;
    }

    comprobar(`perfil de ${p.correo}`, (await servicio.from("perfil").upsert({ id, nombre: p.nombre, apellido: p.apellido })).error);

    // Su estado de partida: lo que dejó una corrida anterior se borra.
    comprobar(`membresías de ${p.correo}`, (await servicio.from("membresia_unidad").delete().eq("usuario_id", id)).error);
    comprobar(`edificio de ${p.correo}`, (await servicio.from("membresia_condominio").delete().eq("usuario_id", id)).error);

    for (const unidad of p.unidades ?? []) {
      comprobar(`vivienda de ${p.correo}`, (await servicio.from("membresia_unidad").insert({ ...COMUNES, ...unidad, usuario_id: id })).error);
    }
    if (p.condominio) {
      comprobar(`edificio de ${p.correo}`, (await servicio.from("membresia_condominio").insert({ ...p.condominio, usuario_id: id })).error);
    }
  }
}

export async function teardown() {
  const existentes = await cuentasExistentes();
  const fallos: string[] = [];

  for (const p of PERSONAS) {
    const id = existentes.get(p.correo);
    if (!id) continue;

    // Lo que apunta a la cuenta sin borrado en cascada, y que impediría borrarla.
    await servicio.from("llamada_internet").delete().or(`de_usuario_id.eq.${id},contestada_por.eq.${id}`);
    await servicio.from("invitado").update({ revision_anfitrion_por: null }).eq("revision_anfitrion_por", id);
    await servicio.from("invitado").update({ revision_menor_por: null }).eq("revision_menor_por", id);
    await servicio.from("contacto_condominio").update({ creado_por: null }).eq("creado_por", id);
    // Sus membresías, antes: al borrar la cuenta pasarían a no tener dueño, y
    // `membresia_unidad_con_acceso_requiere_cuenta` no deja una con acceso sin cuenta.
    await servicio.from("membresia_unidad").delete().eq("usuario_id", id);
    await servicio.from("membresia_condominio").delete().eq("usuario_id", id);

    const { error } = await servicio.auth.admin.deleteUser(id);
    if (error) fallos.push(`${p.correo}: ${error.message}`);
  }

  // No se lanza: un fallo aquí no debe tapar el resultado de la corrida. La
  // siguiente corrida la encuentra y la reutiliza.
  if (fallos.length) console.warn(`No se pudieron retirar personas de prueba:\n${fallos.join("\n")}`);
}
