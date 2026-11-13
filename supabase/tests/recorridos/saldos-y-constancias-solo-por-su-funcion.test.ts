import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { entrarComo, isoEnDias, retirarEstancia, salir, servicio, supabase } from "./cliente";
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
const U101 = "44444444-4444-4444-4444-444444444441"; // Guillermo, sin suscripción y sin nadie viviendo
const ANFITRIONA = "vecino@veciyo.test"; // Sofía
const MARCA = "[prueba] saldos solo por su funcion";

let suscripcionId = "";
let cuota = 0;
/** `suscripcion_renta_corta.verificaciones_base` por defecto. */
const CUOTA_POR_DEFECTO = 20;
let verificacionId = "";
let invitadoId = "";
let estanciaPropia = "";
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

  /*
    Su estancia, su huésped con los términos sin aceptar y su verificación,
    traídos por la prueba (11/11/2026). Antes tomaba «la primera que haya» de
    la 102, y desde que se vació la base el 29/10 no había ninguna. Se crean
    con la clave de servicio --lo que se comprueba es lo que la anfitriona
    puede hacer después-- y se retiran al terminar.
  */
  const { data: viejas } = await servicio.from("visita").select("id").eq("anotaciones_ingreso", MARCA);
  for (const vieja of viejas ?? []) await retirarEstancia(vieja.id);
  const { data: e, error: errorE } = await servicio
    .from("visita")
    .insert({
      condominio_id: "11111111-1111-1111-1111-111111111111",
      unidad_id: U102,
      tipo: "huesped_temporal",
      estado: "programada",
      fecha_desde: isoEnDias(250),
      fecha_hasta: isoEnDias(252),
      anotaciones_ingreso: MARCA,
    })
    .select("id")
    .single();
  if (errorE) throw new Error(`No se pudo crear la estancia: ${errorE.message}`);
  estanciaPropia = e!.id;
  const { data: i, error: errorI } = await servicio
    .from("invitado")
    .insert({ visita_id: estanciaPropia, nombre: `${MARCA} huésped`, es_titular: true, terminos_aceptados: false })
    .select("id")
    .single();
  if (errorI) throw new Error(`No se pudo crear el huésped: ${errorI.message}`);
  invitadoId = i!.id;
  // Del periodo de la suscripción: una verificación «de la cuota» va con él.
  const { data: periodo, error: errorP } = await servicio
    .from("periodo_suscripcion")
    .select("id")
    .eq("suscripcion_id", suscripcionId)
    .order("desde", { ascending: false })
    .limit(1)
    .single();
  if (errorP) throw new Error(`La 102 no tiene periodo: ${errorP.message}`);
  const { data: v, error: errorV } = await servicio
    .from("verificacion_antecedentes")
    .insert({ invitado_id: invitadoId, unidad_id: U102, origen: "paquete_base", periodo_id: periodo.id, proveedor: MARCA })
    .select("id")
    .single();
  if (errorV) throw new Error(`No se pudo crear la verificación: ${errorV.message}`);
  verificacionId = v!.id;

  await servicio.from("paquete_verificaciones").delete().eq("referencia", MARCA);
  await entrarComo(ANFITRIONA);
});

afterAll(async () => {
  await salir();
  await servicio.from("paquete_verificaciones").delete().eq("referencia", MARCA);
  if (estanciaPropia) {
    const { error } = await retirarEstancia(estanciaPropia);
    if (error) throw new Error(`No se pudo retirar la estancia: ${error.message}`);
  }
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
      cuota la pone la base. Con Guillermo en su 101, que no tiene suscripción
      y donde no vive nadie: era Marcela en su 301, pero ella vive ahí, y desde
      el 29/10/2026 (D-70) quien vive en la vivienda no la alquila por noches.
    */
    await salir();
    await entrarComo("propietario@veciyo.test");
    await servicio.from("suscripcion_renta_corta").delete().eq("unidad_id", U101);
    const { data, error } = await supabase
      .from("suscripcion_renta_corta")
      .insert({ unidad_id: U101, estado: "activa", verificaciones_base: 9999 })
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
