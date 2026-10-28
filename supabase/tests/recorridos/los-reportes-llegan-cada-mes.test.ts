import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { entrarComo, salir, servicio, supabase } from "./cliente";
import {
  guardarEnvioMensual,
  obtenerEnvioMensual,
} from "@/features/administrador/services/reportes.repo";

/**
 * Recorrido: los reportes llegan cada mes por correo si la administración lo
 * enciende (28/10/2026, hueco 7).
 *
 * Se usa «Mirador del Este», el segundo edificio de prueba: sus cuentas son
 * @veciyo.test y nunca reciben correo, así que si la tarea diaria de las 12:00
 * UTC coincide con esta prueba no le llega nada a nadie de verdad.
 */

const MIRADOR = "22222222-2222-2222-2222-222222222222";
const ADMIN_MIRADOR = "admin2@veciyo.test";
const VECINO_MIRADOR = "vecino2@veciyo.test";
const ADMIN_BARRANQUERAS = "admin@veciyo.test";

let comoEstaba: { reportes_mensuales_activo: boolean; reportes_mensuales_dia: number } | null = null;

async function hoyEnMirador(): Promise<number> {
  // El día con el reloj del edificio, que es con el que cuenta la regla.
  const { data: zona } = await servicio.rpc("zona_horaria_del_condominio", { p_condominio_id: MIRADOR });
  const partes = new Intl.DateTimeFormat("en-GB", { timeZone: String(zona), day: "2-digit" }).formatToParts(new Date());
  return Number(partes.find((p) => p.type === "day")!.value);
}

beforeAll(async () => {
  const { data, error } = await servicio
    .from("condominio")
    .select("reportes_mensuales_activo, reportes_mensuales_dia")
    .eq("id", MIRADOR)
    .single();
  if (error) throw error;
  comoEstaba = data;
  await servicio.from("envio_reporte_mensual").delete().eq("condominio_id", MIRADOR);
});

afterAll(async () => {
  await salir();
  if (comoEstaba) await servicio.from("condominio").update(comoEstaba).eq("id", MIRADOR);
  await servicio.from("envio_reporte_mensual").delete().eq("condominio_id", MIRADOR);
});

describe("quién lo enciende", () => {
  it("la administración del edificio lo enciende y elige el día", async () => {
    await entrarComo(ADMIN_MIRADOR);
    await guardarEnvioMensual(MIRADOR, { activo: true, dia: 5 });
    expect(await obtenerEnvioMensual(MIRADOR)).toEqual({ activo: true, dia: 5 });
    await guardarEnvioMensual(MIRADOR, { activo: false, dia: 5 });
    expect((await obtenerEnvioMensual(MIRADOR)).activo).toBe(false);
  });

  it("un día fuera del 1 al 28 se rechaza", async () => {
    await entrarComo(ADMIN_MIRADOR);
    await expect(guardarEnvioMensual(MIRADOR, { activo: true, dia: 31 })).rejects.toThrow(/entre el 1 y el 28/);
  });

  it("un vecino no puede", async () => {
    await entrarComo(VECINO_MIRADOR);
    await expect(guardarEnvioMensual(MIRADOR, { activo: true, dia: 5 })).rejects.toThrow(/Solo la administración/);
  });

  it("ni la administración de otro edificio", async () => {
    await entrarComo(ADMIN_BARRANQUERAS);
    await expect(guardarEnvioMensual(MIRADOR, { activo: true, dia: 5 })).rejects.toThrow(/Solo la administración/);
  });
});

describe("las piezas internas no son públicas", () => {
  for (const [fn, args] of [
    ["datos_reporte_visitantes", { p_condominio_id: MIRADOR }],
    ["datos_reporte_correspondencia", { p_condominio_id: MIRADOR }],
    ["datos_reporte_areas_comunes", { p_condominio_id: MIRADOR }],
    ["reportes_mensuales_por_enviar", {}],
    ["enviar_reportes_mensuales", {}],
  ] as const) {
    it(`${fn}: ni la administración la puede llamar`, async () => {
      await entrarComo(ADMIN_MIRADOR);
      const { error } = await supabase.rpc(fn as never, args as never);
      expect(error?.message).toMatch(/permission denied/);
    });
  }

  it("y con la clave de servicio sí (el control positivo)", async () => {
    const { error } = await servicio.rpc("datos_reporte_visitantes", { p_condominio_id: MIRADOR });
    expect(error).toBeNull();
  });

  it("los reportes públicos siguen funcionando para quien administra", async () => {
    await entrarComo(ADMIN_MIRADOR);
    const { error } = await supabase.rpc("reporte_visitantes", { p_condominio_id: MIRADOR });
    expect(error).toBeNull();
  });
});

describe("a quién le toca hoy", () => {
  it("encendido y con el día de hoy, sale con el mes anterior entero", async () => {
    const dia = await hoyEnMirador();
    if (dia > 28) return; // El 29, 30 y 31 no se pueden elegir: hoy no le toca a nadie.
    await servicio
      .from("condominio")
      .update({ reportes_mensuales_activo: true, reportes_mensuales_dia: dia })
      .eq("id", MIRADOR);

    const { data, error } = await servicio.rpc("reportes_mensuales_por_enviar");
    expect(error).toBeNull();
    const fila = (data ?? []).find((f: { condominio_id: string }) => f.condominio_id === MIRADOR);
    expect(fila, "Mirador tiene que salir hoy").toBeTruthy();
    expect(fila.desde.slice(8, 10)).toBe("01");
    expect(new Date(`${fila.hasta}T12:00:00Z`).getUTCMonth()).toBe(new Date(`${fila.desde}T12:00:00Z`).getUTCMonth());
    const correos = (fila.destinatarios as { correo: string; reportes: string[] }[]);
    const renata = correos.find((d) => d.correo === ADMIN_MIRADOR);
    expect(renata?.reportes).toEqual(["visitantes", "correspondencia", "areas-comunes"]);
  });

  it("apagado no sale", async () => {
    await servicio.from("condominio").update({ reportes_mensuales_activo: false }).eq("id", MIRADOR);
    const { data } = await servicio.rpc("reportes_mensuales_por_enviar");
    expect((data ?? []).some((f: { condominio_id: string }) => f.condominio_id === MIRADOR)).toBe(false);
  });

  it("y un mes ya enviado no se repite", async () => {
    const dia = await hoyEnMirador();
    if (dia > 28) return;
    await servicio
      .from("condominio")
      .update({ reportes_mensuales_activo: true, reportes_mensuales_dia: dia })
      .eq("id", MIRADOR);
    const { data: antes } = await servicio.rpc("reportes_mensuales_por_enviar");
    const fila = (antes ?? []).find((f: { condominio_id: string }) => f.condominio_id === MIRADOR);
    expect(fila).toBeTruthy();

    const { error } = await servicio
      .from("envio_reporte_mensual")
      .insert({ condominio_id: MIRADOR, periodo: fila.desde, destinatarios: 1 });
    expect(error).toBeNull();

    const { data: despues } = await servicio.rpc("reportes_mensuales_por_enviar");
    expect((despues ?? []).some((f: { condominio_id: string }) => f.condominio_id === MIRADOR)).toBe(false);
  });
});

describe("la constancia del envío", () => {
  it("la ve su administración y no la de otro edificio", async () => {
    // Se trae su fila: un mes que nadie va a reportar de verdad.
    await servicio.from("envio_reporte_mensual").delete().eq("condominio_id", MIRADOR);
    const { error } = await servicio
      .from("envio_reporte_mensual")
      .insert({ condominio_id: MIRADOR, periodo: "2020-01-01", destinatarios: 1 });
    expect(error).toBeNull();

    await entrarComo(ADMIN_MIRADOR);
    const { data: propia } = await supabase.from("envio_reporte_mensual").select("id").eq("condominio_id", MIRADOR);
    expect(propia?.length).toBeGreaterThan(0);

    await entrarComo(ADMIN_BARRANQUERAS);
    const { data: ajena } = await supabase.from("envio_reporte_mensual").select("id").eq("condominio_id", MIRADOR);
    expect(ajena ?? []).toHaveLength(0);
  });
});
