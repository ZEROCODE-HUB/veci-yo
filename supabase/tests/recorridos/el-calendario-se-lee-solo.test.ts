import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { entrarComo, salir, servicio, supabase } from "./cliente";

/**
 * Recorrido: el calendario del alojamiento se lee solo.
 *
 * Lo pidio el cliente el 09/10/2026: que la reserva de Airbnb se cree sin que
 * nadie pulse «Sincronizar», y que cada cuanto se lee se cambie **desde la
 * base**. Un cron pregunta cada cinco minutos a quien le toca; esto comprueba
 * la pregunta --`calendarios_por_sincronizar`--, que es donde vive la regla.
 *
 * En la 205 y no en la 102: la 102 tiene el calendario de verdad del cliente
 * y el cron la lee mientras corre la suite.
 */

const U205 = "44444444-4444-4444-4444-444444444442";
const VECINA_DE_OTRA = "vecino@veciyo.test";
const DUENO_PLATAFORMA = "dueno@veciyo.test";

// Un dominio que no existe: si el cron llega a pedirlo, no llama a ningun portal.
const CALENDARIO = "https://calendario.veciyo.test/prueba.ics";

interface Fila {
  ical_url: string | null;
  ical_sincronizado_en: string | null;
  ical_pedido_en: string | null;
  ical_error: string | null;
}
let comoEstaba: Fila | null = null;
let intervaloOriginal = "";

const hace = (minutos: number) => new Date(Date.now() - minutos * 60_000).toISOString();

async function poner(cambios: Partial<Fila>) {
  const { error } = await servicio
    .from("suscripcion_renta_corta")
    .update(cambios)
    .eq("unidad_id", U205);
  if (error) throw new Error(error.message);
}

async function leToca(): Promise<boolean> {
  const { data, error } = await servicio.rpc("calendarios_por_sincronizar");
  if (error) throw new Error(error.message);
  return ((data ?? []) as { unidad_id: string }[]).some((f) => f.unidad_id === U205);
}

async function ponerIntervalo(valor: string) {
  const { error } = await servicio
    .from("configuracion_plataforma")
    .update({ valor })
    .eq("clave", "calendario_intervalo_minutos");
  if (error) throw new Error(error.message);
}

beforeAll(async () => {
  // La fila cruda, para devolverla por escritura directa.
  const { data, error } = await servicio
    .from("suscripcion_renta_corta")
    .select("ical_url, ical_sincronizado_en, ical_pedido_en, ical_error")
    .eq("unidad_id", U205)
    .single();
  if (error) throw new Error(error.message);
  comoEstaba = data as Fila;
  // Si lo guardado ya trae lo de una corrida muerta, se dice aqui.
  if (comoEstaba.ical_url === CALENDARIO) {
    throw new Error("La 205 quedo con el calendario de prueba de otra corrida");
  }

  const { data: ajuste } = await servicio
    .from("configuracion_plataforma")
    .select("valor")
    .eq("clave", "calendario_intervalo_minutos")
    .single();
  intervaloOriginal = ajuste!.valor;
});

afterAll(async () => {
  if (intervaloOriginal) await ponerIntervalo(intervaloOriginal);
  if (comoEstaba) await poner(comoEstaba);
  await salir();
});

describe("a quien le toca leer el calendario", () => {
  it("a una vivienda sin calendario conectado, nunca", async () => {
    await poner({ ical_url: null, ical_sincronizado_en: null, ical_pedido_en: null });
    expect(await leToca()).toBe(false);
  });

  it("a una que lo acaba de conectar, en la primera pasada", async () => {
    await poner({ ical_url: CALENDARIO, ical_sincronizado_en: null, ical_pedido_en: null });
    expect(await leToca()).toBe(true);
  });

  it("recien leida no se vuelve a leer", async () => {
    await poner({ ical_sincronizado_en: hace(10), ical_pedido_en: null });
    expect(await leToca()).toBe(false);
  });

  it("y pasada la hora, si", async () => {
    await poner({ ical_sincronizado_en: hace(120), ical_pedido_en: null });
    expect(await leToca()).toBe(true);
  });

  it("si ya se pidio hace un momento no se repite, aunque no haya respondido", async () => {
    /*
      Es lo que evita llamar cada cinco minutos a un portal que esta caido: la
      lectura no llego a apuntarse, pero la peticion si.
    */
    await poner({ ical_sincronizado_en: hace(120), ical_pedido_en: hace(1) });
    expect(await leToca()).toBe(false);
  });

  it("el intervalo sale de la base: al bajarlo, le toca antes", async () => {
    /*
      Leida hace diez minutos: con la hora de serie no le toca --el caso de
      arriba-- y con cinco minutos si. Sin esto, un intervalo escrito a fuego
      en la funcion pasaria todo lo demas.
    */
    await poner({ ical_sincronizado_en: hace(10), ical_pedido_en: null });
    await ponerIntervalo("5");
    expect(await leToca()).toBe(true);

    await ponerIntervalo(intervaloOriginal);
    expect(await leToca()).toBe(false);
  });
});

describe("la configuracion de la plataforma", () => {
  it("la lee quien opera Veciyo", async () => {
    await entrarComo(DUENO_PLATAFORMA);
    const { data, error } = await supabase
      .from("configuracion_plataforma")
      .select("clave");
    expect(error).toBeNull();
    expect((data ?? []).map((f) => f.clave)).toContain("calendario_intervalo_minutos");
  });

  it("y una vecina no, ni la cambia", async () => {
    await entrarComo(VECINA_DE_OTRA);
    const { data } = await supabase.from("configuracion_plataforma").select("clave");
    expect(data ?? []).toEqual([]);

    await supabase
      .from("configuracion_plataforma")
      .update({ valor: "1" })
      .eq("clave", "calendario_intervalo_minutos");

    // Un `update` de cero filas no da error: lo que cuenta es que no cambio.
    const { data: sigue } = await servicio
      .from("configuracion_plataforma")
      .select("valor")
      .eq("clave", "calendario_intervalo_minutos")
      .single();
    expect(sigue?.valor).toBe(intervaloOriginal);
  });

  it("tampoco la cambia quien opera Veciyo desde la aplicacion", async () => {
    // Se cambia con la clave de servicio, no con una sesion.
    await entrarComo(DUENO_PLATAFORMA);
    await supabase
      .from("configuracion_plataforma")
      .update({ valor: "1" })
      .eq("clave", "calendario_intervalo_minutos");

    const { data: sigue } = await servicio
      .from("configuracion_plataforma")
      .select("valor")
      .eq("clave", "calendario_intervalo_minutos")
      .single();
    expect(sigue?.valor).toBe(intervaloOriginal);
  });
});

describe("quien puede pedir la lectura como si fuera el cron", () => {
  const estadoDe = (error: unknown) =>
    (error as { context?: Response } | null)?.context?.status;

  it("decir «soy el cron» con una sesion cualquiera no sirve", async () => {
    await poner({ ical_url: CALENDARIO, ical_error: null });
    await entrarComo(VECINA_DE_OTRA);
    const { error } = await supabase.functions.invoke("sincronizar-calendario", {
      body: { unidadId: U205, desdeElCron: true },
    });
    // 403: se le aplico el camino de siempre, que pregunta si manda en la 205.
    expect(estadoDe(error)).toBe(403);
  });

  it("con la clave de servicio pasa, y llega hasta pedir el calendario", async () => {
    /*
      El control: el dominio no existe, asi que lo que vuelve es «no se pudo
      abrir el enlace» --502-- y no un rechazo. Eso solo ocurre si la funcion
      acepto al cron, encontro la vivienda y fue a buscar el calendario.
    */
    const { error } = await servicio.functions.invoke("sincronizar-calendario", {
      body: { unidadId: U205, desdeElCron: true },
    });
    expect(estadoDe(error)).toBe(502);

    const { data } = await servicio
      .from("suscripcion_renta_corta")
      .select("ical_error")
      .eq("unidad_id", U205)
      .single();
    expect(data?.ical_error).toMatch(/calendario/i);
  });
});
