import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { entrarComo, salir, servicio, supabase } from "./cliente";

/**
 * Recorrido: el chat apagado de un guardia, también en la base (15/10/2026,
 * hueco 22).
 *
 * La administración apaga el chat de Juan y la pantalla se lo esconde. Aquí se
 * comprueba la otra mitad: que llamando a la API tampoco lee ni escribe en el
 * hilo de portería de la 102. Y al lado, con el chat encendido, que sí.
 */

const U102 = "44444444-4444-4444-4444-444444444443";
const GUARDIA = "guardia@veciyo.test"; // Juan

let membresiaId = "";
let permisosAntes: unknown = null;
let hilo = "";

const ponerChat = async (chat: boolean) => {
  const { error } = await servicio
    .from("membresia_condominio")
    .update({ permisos: { ...(permisosAntes as object), chat } })
    .eq("id", membresiaId);
  if (error) throw new Error(error.message);
};

beforeAll(async () => {
  const juan = await entrarComo(GUARDIA);
  await salir();
  // La fila cruda, para devolverla tal cual aunque la prueba falle a medias.
  const { data: m } = await servicio
    .from("membresia_condominio")
    .select("id, permisos")
    .eq("usuario_id", juan)
    .eq("rol", "guardia")
    .single();
  membresiaId = m!.id;
  permisosAntes = m!.permisos;

  const { data: c } = await servicio
    .from("conversacion")
    .select("id")
    .eq("tipo", "area")
    .eq("area", "seguridad")
    .eq("unidad_id", U102)
    .limit(1)
    .single();
  hilo = c!.id;
});

afterAll(async () => {
  await salir();
  // Si la regla se abriera, el mensaje entraría: se retira por su texto.
  await servicio.from("mensaje").delete().like("texto", "[prueba] no deberia entrar%");
  const { error } = await servicio
    .from("membresia_condominio")
    .update({ permisos: permisosAntes })
    .eq("id", membresiaId);
  if (error) throw new Error(error.message);
});

describe("el guardia y el hilo de portería de la 102", () => {
  it("con el chat encendido, lo ve", async () => {
    // El control: sin él, el caso de abajo pasaría igual si el hilo no existiera.
    await ponerChat(true);
    await entrarComo(GUARDIA);
    const { data } = await supabase.from("conversacion").select("id").eq("id", hilo);
    await salir();
    expect(data).toHaveLength(1);
  });

  it("con el chat apagado, ni lo ve ni escribe en él", async () => {
    await ponerChat(false);
    await entrarComo(GUARDIA);
    const { data: ve } = await supabase.from("conversacion").select("id").eq("id", hilo);
    const { data: mensajes } = await supabase.from("mensaje").select("id").eq("conversacion_id", hilo);
    const { error } = await supabase
      .from("mensaje")
      .insert({ conversacion_id: hilo, autor_id: (await supabase.auth.getUser()).data.user!.id, texto: "[prueba] no deberia entrar", autor_nombre: "Juan" }, { count: "exact" });
    await salir();
    expect(ve).toEqual([]);
    expect(mensajes).toEqual([]);
    expect(error?.message ?? "").toMatch(/row-level security/);
  });
});
