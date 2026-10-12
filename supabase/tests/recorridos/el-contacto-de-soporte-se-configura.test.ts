import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { entrarComo, salir, servicio, supabase } from "./cliente";
import {
  contactoDeSoporte,
  enlaceDeSoporte,
} from "../../../../veciyo-web/src/lib/soporte";

/**
 * Recorrido: el contacto de soporte se cambia desde la base.
 *
 * Decidido con el cliente el 11/10/2026. El pie de la web del preregistro
 * enlazaba «Soporte» a una direccion que no existia; ahora sale del correo y
 * el WhatsApp que haya en `configuracion_plataforma`.
 *
 * Lo lee un huesped **sin cuenta**, y esa tabla es solo de quien opera la
 * plataforma: lo que se comprueba es que se abren esas dos claves y ninguna
 * mas.
 */

const CLAVES = ["soporte_correo", "soporte_whatsapp"] as const;
const VECINA = "vecino@veciyo.test";

let comoEstaban: { clave: string; valor: string }[] = [];

async function poner(clave: (typeof CLAVES)[number], valor: string) {
  const { error } = await servicio
    .from("configuracion_plataforma")
    .update({ valor })
    .eq("clave", clave);
  if (error) throw new Error(error.message);
}

beforeAll(async () => {
  const { data, error } = await servicio
    .from("configuracion_plataforma")
    .select("clave, valor")
    .in("clave", [...CLAVES]);
  if (error) throw new Error(error.message);
  comoEstaban = data ?? [];
  if (comoEstaban.length !== 2) throw new Error("Faltan las claves de soporte");
  await salir();
});

afterAll(async () => {
  for (const { clave, valor } of comoEstaban) {
    await poner(clave as (typeof CLAVES)[number], valor);
  }
  await salir();
});

describe("el contacto de soporte", () => {
  it("sin configurar no hay contacto, y la web no tiene a donde enlazar", async () => {
    await poner("soporte_correo", "");
    await poner("soporte_whatsapp", "  ");

    const contacto = await contactoDeSoporte(supabase as never);
    expect(contacto).toBeNull();
    expect(enlaceDeSoporte(contacto)).toBeNull();
  });

  it("solo con correo, quien no tiene cuenta lo lee y el enlace es de correo", async () => {
    await poner("soporte_correo", " ayuda@veciyo.test ");
    await poner("soporte_whatsapp", "");

    const contacto = await contactoDeSoporte(supabase as never);
    expect(contacto).toEqual({ correo: "ayuda@veciyo.test", whatsapp: null });
    expect(enlaceDeSoporte(contacto)).toBe("mailto:ayuda@veciyo.test");
  });

  it("el WhatsApp sale solo en digitos, lo tecleen como lo tecleen, y va primero", async () => {
    await poner("soporte_whatsapp", "+57 300 123-4567");

    const contacto = await contactoDeSoporte(supabase as never);
    expect(contacto?.whatsapp).toBe("573001234567");
    expect(enlaceDeSoporte(contacto)).toBe("https://wa.me/573001234567");
  });

  it("con sesion tambien se lee", async () => {
    await entrarComo(VECINA);
    const contacto = await contactoDeSoporte(supabase as never);
    expect(contacto?.correo).toBe("ayuda@veciyo.test");
    await salir();
  });
});

describe("lo que no se abre", () => {
  it("la tabla sigue cerrada: ni sin cuenta ni una vecina leen ningun ajuste", async () => {
    const sinCuenta = await supabase.from("configuracion_plataforma").select("clave");
    expect(sinCuenta.data ?? []).toHaveLength(0);

    await entrarComo(VECINA);
    const vecina = await supabase.from("configuracion_plataforma").select("clave");
    expect(vecina.data ?? []).toHaveLength(0);
    await salir();
  });

  it("lo que devuelve no es ningun otro ajuste de la plataforma", async () => {
    // El control de la mutacion: que la funcion lea otra clave por descuido.
    const { data: otros } = await servicio
      .from("configuracion_plataforma")
      .select("valor")
      .not("clave", "in", `(${CLAVES.join(",")})`);
    const ajenos = (otros ?? []).map((o) => o.valor);

    const { data, error } = await supabase.rpc("contacto_de_soporte");
    expect(error).toBeNull();
    const fila = (Array.isArray(data) ? data[0] : data) as Record<string, unknown>;
    expect(Object.keys(fila).sort()).toEqual(["correo", "whatsapp"]);
    expect(fila.correo).toBe("ayuda@veciyo.test");
    expect(ajenos).not.toContain(fila.correo);
  });
});
