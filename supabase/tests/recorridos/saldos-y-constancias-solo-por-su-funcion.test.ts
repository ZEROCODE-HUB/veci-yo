import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { entrarComo, salir, servicio, supabase } from "./cliente";
import { comprarPaqueteVerificaciones } from "@/features/visitas/services/visitas.repo";

/**
 * Recorrido: saldos de verificación y constancias, solo por su función
 * (15/10/2026, huecos 23 y 24).
 *
 * Con la sesión de la anfitriona de la 102 se intenta, llamando a la API,
 * todo lo que antes se podía y no debía: borrar verificaciones, crearse
 * paquetes, cambiarse la cuota, abrir un período con la cuota que se quiera,
 * marcar un documento como verificado y unos términos como aceptados. Y al
 * lado, lo que sí tiene que seguir funcionando: leer, y comprar por su botón.
 */

const U102 = "44444444-4444-4444-4444-444444444443";
const U301 = "44444444-4444-4444-4444-444444444444"; // Marcela, sin suscripción
const ANFITRIONA = "vecino@veciyo.test"; // Sofía
const MARCA = "[prueba] saldos solo por su funcion";

let suscripcionId = "";
let cuota = 0;
/** `suscripcion_renta_corta.verificaciones_base` por defecto. */
const CUOTA_POR_DEFECTO = 20;
let verificacionId = "";
let invitadoId = "";
const periodos: string[] = [];
let suscripcionNueva = "";

const fallo = (error: { message?: string } | null) => error?.message ?? "";

beforeAll(async () => {
  const { data: s } = await servicio
    .from("suscripcion_renta_corta")
    .select("id, verificaciones_base")
    .eq("unidad_id", U102)
    .single();
  suscripcionId = s!.id;
  cuota = s!.verificaciones_base;

  const { data: v } = await servicio
    .from("verificacion_antecedentes")
    .select("id")
    .eq("unidad_id", U102)
    .limit(1)
    .single();
  verificacionId = v!.id;

  // Un huésped de la 102 con los términos sin aceptar.
  const { data: visitas } = await servicio.from("visita").select("id").eq("unidad_id", U102);
  const { data: i } = await servicio
    .from("invitado")
    .select("id")
    .in("visita_id", (visitas ?? []).map((x) => x.id))
    .eq("terminos_aceptados", false)
    .limit(1)
    .single();
  invitadoId = i!.id;

  await servicio.from("paquete_verificaciones").delete().eq("referencia", MARCA);
  await entrarComo(ANFITRIONA);
});

afterAll(async () => {
  await salir();
  await servicio.from("paquete_verificaciones").delete().eq("referencia", MARCA);
  if (suscripcionNueva) {
    const { error } = await servicio.from("suscripcion_renta_corta").delete().eq("id", suscripcionNueva);
    if (error) throw new Error(error.message);
  }
  if (periodos.length) {
    const { error } = await servicio.from("periodo_suscripcion").delete().in("id", periodos);
    if (error) throw new Error(error.message);
  }
});

describe("la anfitriona, llamando a la API", () => {
  it("sigue leyendo sus verificaciones y su suscripción", async () => {
    // El control: lo de abajo no prueba nada si tampoco pudiera leer.
    const { data: v } = await supabase.from("verificacion_antecedentes").select("id").eq("id", verificacionId);
    const { data: s } = await supabase.from("suscripcion_renta_corta").select("id").eq("id", suscripcionId);
    expect(v).toHaveLength(1);
    expect(s).toHaveLength(1);
  });

  it("no borra una verificación (bajaría su consumo del mes)", async () => {
    await supabase.from("verificacion_antecedentes").delete().eq("id", verificacionId);
    const { data } = await servicio.from("verificacion_antecedentes").select("id").eq("id", verificacionId);
    expect(data).toHaveLength(1);
  });

  it("no se crea un paquete de verificaciones sin comprarlo", async () => {
    const { error } = await supabase
      .from("paquete_verificaciones")
      .insert({ unidad_id: U102, cantidad: 500, referencia: MARCA, vence_en: "2030-01-01" }, { count: "exact" })
      .select("id");
    expect(fallo(error)).toMatch(/row-level security/);
  });

  it("pero sí lo compra por su botón", async () => {
    await comprarPaqueteVerificaciones({ unidadId: U102, cantidad: 10, referencia: MARCA });
    const { data } = await servicio.from("paquete_verificaciones").select("cantidad").eq("referencia", MARCA);
    expect(data).toEqual([{ cantidad: 10 }]);
  });

  it("no se cambia la cuota de la suscripción", async () => {
    const { error } = await supabase
      .from("suscripcion_renta_corta")
      .update({ verificaciones_base: 9999 })
      .eq("id", suscripcionId);
    expect(fallo(error)).toMatch(/no se cambia a mano/);
    const { data } = await servicio.from("suscripcion_renta_corta").select("verificaciones_base").eq("id", suscripcionId).single();
    expect(data!.verificaciones_base).toBe(cuota);
  });

  it("y una suscripción creada directo lleva la cuota por defecto, no la que mande", async () => {
    /*
      Crearla directo se permite --lo usan las pruebas de permisos--, pero la
      cuota la pone la base. Con Marcela en su 301, que no tiene suscripción.
    */
    await salir();
    await entrarComo("admin@veciyo.test");
    const { data, error } = await supabase
      .from("suscripcion_renta_corta")
      .insert({ unidad_id: U301, estado: "activa", verificaciones_base: 9999 })
      .select("id, verificaciones_base")
      .single();
    await salir();
    await entrarComo(ANFITRIONA);
    expect(error).toBeNull();
    suscripcionNueva = data!.id;
    /*
      Contra el valor por defecto de la columna (20), no contra la cuota de la
      102: la 102 tiene 1000 a propósito, para que las pruebas no le agoten
      las verificaciones, y el caso se ponía rojo comparando con ella
      (17/10/2026).
    */
    expect(data!.verificaciones_base).not.toBe(9999);
    expect(data!.verificaciones_base).toBe(CUOTA_POR_DEFECTO);
  });

  it("y un período pagado lleva la cuota de su suscripción, no la que mande", async () => {
    const { data, error } = await supabase
      .from("periodo_suscripcion")
      .insert({
        suscripcion_id: suscripcionId,
        desde: "2031-01-01",
        hasta: "2031-02-01",
        verificaciones_base: 9999,
        referencia_pago: MARCA,
        pagado_en: new Date().toISOString(),
      })
      .select("id, verificaciones_base")
      .single();
    expect(error).toBeNull();
    periodos.push(data!.id);
    expect(data!.verificaciones_base).toBe(cuota);
  });

  it("no marca un documento como verificado", async () => {
    const { error } = await supabase
      .from("verificacion_documento")
      .insert({ invitado_id: invitadoId, estado: "verificado" });
    expect(fallo(error)).toMatch(/row-level security/);
  });

  it("ni los términos de un huésped como aceptados", async () => {
    const { error } = await supabase
      .from("invitado")
      .update({ terminos_aceptados: true })
      .eq("id", invitadoId);
    expect(fallo(error)).toMatch(/desde su botón/);
    const { data } = await servicio.from("invitado").select("terminos_aceptados").eq("id", invitadoId).single();
    expect(data!.terminos_aceptados).toBe(false);
  });
});
