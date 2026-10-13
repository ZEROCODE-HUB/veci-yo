import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { entrarComo, salir, servicio } from "./cliente";
import { eliminarMiCuenta } from "@/features/perfil/services/cuenta.repo";

/**
 * Recorrido: eliminar la cuenta funciona.
 *
 * Hasta el 13/10/2026 el botón pedía el motivo y una confirmación para
 * responder «todavía no está disponible».
 *
 * **Las cuentas son de este recorrido, de usar y tirar.** Nunca se llama con
 * una de las diez de prueba: si el guarda fallara, esa cuenta desaparecería
 * de verdad y con ella media suite. Por eso también el caso que tiene que
 * rechazarse monta su propio edificio en vez de preguntar con Marcela.
 */

const CONDOMINIO = "11111111-1111-1111-1111-111111111111";
const U205 = "44444444-4444-4444-4444-444444444442";
const CLAVE = "Prueba123!";
const MARCA = "[prueba] cuenta que se elimina";

const marca = Date.now();
const VECINA = `borrar.vecina.${marca}@veciyo.test`;
const UNICA_ADMIN = `borrar.admin.${marca}@veciyo.test`;

let vecinaId = "";
let adminId = "";
let membresiaId = "";
let edificioId = "";

async function cuentaNueva(correo: string, nombre: string) {
  const { data, error } = await servicio.auth.admin.createUser({
    email: correo,
    password: CLAVE,
    email_confirm: true,
  });
  if (error) throw new Error(`No se pudo crear ${correo}: ${error.message}`);
  const id = data.user.id;
  // El perfil lo crea la aplicación al entrar; aquí se pone a mano.
  const { error: errorPerfil } = await servicio
    .from("perfil")
    .upsert({ id, nombre, apellido: "De Prueba" });
  if (errorPerfil) throw new Error(errorPerfil.message);
  return id;
}

async function existe(usuarioId: string) {
  const { data } = await servicio.auth.admin.getUserById(usuarioId);
  return Boolean(data?.user);
}

beforeAll(async () => {
  vecinaId = await cuentaNueva(VECINA, `${MARCA} vecina`);
  adminId = await cuentaNueva(UNICA_ADMIN, `${MARCA} admin`);

  const { data: membresia, error } = await servicio
    .from("membresia_unidad")
    .insert({
      unidad_id: U205,
      usuario_id: vecinaId,
      nombre: `${MARCA} vecina`,
      rol: "residente",
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  membresiaId = membresia.id;

  // Un edificio con una sola persona en administración: esta.
  const { data: edificio, error: errorEdificio } = await servicio
    .from("condominio")
    .insert({ nombre: `${MARCA} ${marca}`, direccion: "Calle 1", pais: "CO" })
    .select("id")
    .single();
  if (errorEdificio) throw new Error(errorEdificio.message);
  edificioId = edificio.id;

  const { error: errorAdmin } = await servicio
    .from("membresia_condominio")
    .insert({
      condominio_id: edificioId,
      usuario_id: adminId,
      rol: "administrador",
      nombre: `${MARCA} admin`,
    });
  if (errorAdmin) throw new Error(errorAdmin.message);
});

afterAll(async () => {
  await salir();
  // Lo que quede. Cada paso mira su error: una limpieza que no comprueba si
  // limpió no es una limpieza.
  if (membresiaId) {
    const { error } = await servicio
      .from("membresia_unidad")
      .delete()
      .eq("id", membresiaId);
    expect(error).toBeNull();
  }
  if (edificioId) {
    await servicio
      .from("membresia_condominio")
      .delete()
      .eq("condominio_id", edificioId);
    const { error } = await servicio
      .from("condominio")
      .delete()
      .eq("id", edificioId);
    expect(error).toBeNull();
  }
  for (const id of [vecinaId, adminId]) {
    if (id && (await existe(id))) await servicio.auth.admin.deleteUser(id);
  }
  await servicio
    .from("cuenta_eliminada")
    .delete()
    .in("usuario_id", [vecinaId, adminId].filter(Boolean));
});

describe("quien se va, se va", () => {
  it("la cuenta deja de existir", async () => {
    await entrarComo(VECINA);
    await eliminarMiCuenta("Ya no resido en este condominio");
    await salir();

    expect(await existe(vecinaId)).toBe(false);
  });

  it("su perfil se va con ella", async () => {
    const { data } = await servicio
      .from("perfil")
      .select("id")
      .eq("id", vecinaId);
    expect(data).toEqual([]);
  });

  it("su membresía queda dada de baja, no borrada, y sin apuntar a nadie", async () => {
    const { data } = await servicio
      .from("membresia_unidad")
      .select("activo, usuario_id")
      .eq("id", membresiaId)
      .single();
    expect(data!.activo).toBe(false);
    expect(data!.usuario_id).toBeNull();
  });

  it("y queda una línea de constancia, con el motivo y sin datos personales", async () => {
    const { data } = await servicio
      .from("cuenta_eliminada")
      .select("*")
      .eq("usuario_id", vecinaId);
    expect(data).toHaveLength(1);
    expect(data![0].motivo).toBe("Ya no resido en este condominio");
    // Lo que tiene la fila: quién (un uuid suelto), por qué y cuándo.
    expect(Object.keys(data![0]).sort()).toEqual(
      ["created_at", "eliminada_en", "id", "motivo", "updated_at", "usuario_id"],
    );
  });
});

describe("quien no se puede ir todavía", () => {
  it("la única administración de un edificio no, y se le dice por qué", async () => {
    await entrarComo(UNICA_ADMIN);
    await expect(eliminarMiCuenta("No uso la aplicación")).rejects.toThrow(
      /única administración/,
    );
    await salir();

    // Lo que importa: sigue ahí, con su edificio.
    expect(await existe(adminId)).toBe(true);
    const { data } = await servicio
      .from("membresia_condominio")
      .select("activo")
      .eq("condominio_id", edificioId)
      .eq("usuario_id", adminId)
      .single();
    expect(data!.activo).toBe(true);
  });

  it("y quien administra el edificio de siempre sigue en su sitio", async () => {
    // El control de que nada de lo de arriba tocó a quien no era.
    const { count } = await servicio
      .from("membresia_condominio")
      .select("id", { count: "exact", head: true })
      .eq("condominio_id", CONDOMINIO)
      .eq("rol", "administrador")
      .eq("activo", true);
    expect(count ?? 0).toBeGreaterThan(0);
  });
});
