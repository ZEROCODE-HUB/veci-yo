import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { entrarComo, salir, servicio, supabase } from "./cliente";
import { datosParaRegistrarse } from "@/shared/services/invitaciones";

/**
 * Recorrido: el registro se rellena con lo que ya dio la invitación
 * (27/10/2026, hueco 58).
 *
 * La vecina invita a alguien a la 102 con su nombre y su teléfono. Quien abre
 * el enlace --sin sesión todavía-- recibe esos datos para no escribirlos otra
 * vez. Con la invitación caducada, nada: el enlace viejo no sirve para leer
 * los datos de nadie.
 */

const CONDOMINIO = "11111111-1111-1111-1111-111111111111";
const U102 = "44444444-4444-4444-4444-444444444443";
const VECINA = "vecino@veciyo.test";
const MARCA = "[prueba] Rellena Registro";

let token = "";
let invitacionId = "";

beforeAll(async () => {
  await servicio.from("invitacion").delete().like("nombre", `${MARCA}%`);
  await entrarComo(VECINA);
  const { data, error } = await supabase.rpc("crear_invitacion", {
    p_condominio_id: CONDOMINIO,
    p_ambito: "unidad",
    p_correo: "rellena.registro@veciyo.test",
    p_nombre: `${MARCA} Gómez`,
    p_unidad_id: U102,
    p_rol_unidad: "corresidente",
    p_telefono: "3105550199",
    p_codigo_pais: "CO",
  });
  await salir();
  if (error) throw error;
  const fila = Array.isArray(data) ? data[0] : data;
  token = fila.token;
  invitacionId = fila.invitacion_id;
});

afterAll(async () => {
  await salir();
  const { error } = await servicio.from("invitacion").delete().eq("id", invitacionId);
  if (error) throw new Error(`No se pudo borrar la invitación: ${error.message}`);
});

describe("lo que el registro ya sabe", () => {
  it("quien abre el enlace recibe su nombre, su correo y su teléfono", async () => {
    const datos = await datosParaRegistrarse(token);
    expect(datos).not.toBeNull();
    expect(`${datos!.nombre} ${datos!.apellido}`).toBe(`${MARCA} Gómez`);
    expect(datos!.correo).toBe("rellena.registro@veciyo.test");
    expect(datos!.telefono).toBe("3105550199");
    expect(datos!.codigoPais).toBe("CO");
  });

  it("con otro token, nada", async () => {
    expect(await datosParaRegistrarse("no-es-un-token")).toBeNull();
  });

  it("con la invitación caducada, nada", async () => {
    await servicio
      .from("invitacion")
      .update({ expira_en: new Date(Date.now() - 60_000).toISOString() })
      .eq("id", invitacionId);
    expect(await datosParaRegistrarse(token)).toBeNull();
  });
});
