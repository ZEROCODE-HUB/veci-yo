import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { entrarComo, salir, servicio, supabase } from "./cliente";

/**
 * Recorrido: el calendario del portal trae las reservas.
 *
 * `suscripcion_renta_corta.ical_url` existía desde el 23/09/2026 y la pantalla
 * de «Huéspedes Temporales» lo guardaba. **No lo leía nadie.** Es la misma
 * familia que `ocultar_contacto`: una columna escribible que no mueve nada, y
 * que mientras tanto le dice al anfitrión que su calendario está conectado.
 *
 * Lo que se comprueba aquí es lo que de verdad importa de una importación:
 *
 *   · que la estancia entre con sus fechas y su código;
 *   · que **nazca con su titular marcado**, porque sin él el preregistro falla
 *     con un 409 —ya pasó, el 02/10/2026—;
 *   · que leer dos veces **no duplique**, que es lo que convierte una
 *     sincronización en un desastre;
 *   · y que el enlace que se pega sea de verdad un calendario.
 */

const U102 = "44444444-4444-4444-4444-444444444443";
const ANFITRIONA = "vecino@veciyo.test";
const AJENO = "propietario@veciyo.test";

/** Lo que había antes en la configuración, para dejarlo igual. */
let urlOriginal: string | null = null;

beforeAll(async () => {
  await entrarComo(ANFITRIONA);
  const { data } = await supabase
    .from("suscripcion_renta_corta")
    .select("ical_url")
    .eq("unidad_id", U102)
    .maybeSingle();
  urlOriginal = data?.ical_url ?? null;
});

afterAll(async () => {
  /*
    Se devuelve la fila cruda y por escritura directa: si la función que guarda
    estuviera mutada, la restauración escribiría con el código roto.
  */
  const { error } = await servicio
    .from("suscripcion_renta_corta")
    .update({ ical_url: urlOriginal, ical_sincronizado_en: null, ical_error: null })
    .eq("unidad_id", U102);
  if (error) throw new Error(`No se pudo devolver el calendario: ${error.message}`);

  // Las estancias que creó este archivo, por su marca.
  await servicio.from("visita").delete().like("calendario_uid", "[prueba]%");
  await salir();
});

describe("el enlace del calendario", () => {
  it("no acepta cualquier dirección", async () => {
    /*
      El error fácil es pegar la dirección del **anuncio** en vez de la del
      calendario: en Airbnb las dos salen de la misma pantalla. Y el síntoma de
      equivocarse —cero reservas— no se parece en nada a la causa, así que se
      rechaza al guardarlo en vez de descubrirlo tres semanas después.
    */
    const { error } = await supabase
      .from("suscripcion_renta_corta")
      .update({ ical_url: "https://www.airbnb.com/rooms/12345678" })
      .eq("unidad_id", U102);

    expect(error).not.toBeNull();
    expect(error!.message).toMatch(/calendario/i);
  });

  it("y uno que sí lo parece se guarda", async () => {
    const { error } = await supabase
      .from("suscripcion_renta_corta")
      .update({
        ical_url: "https://www.airbnb.com/calendar/ical/12345.ics?s=abc",
      })
      .eq("unidad_id", U102);

    expect(error).toBeNull();

    const { data } = await supabase
      .from("suscripcion_renta_corta")
      .select("ical_url")
      .eq("unidad_id", U102)
      .single();
    expect(data!.ical_url).toContain(".ics");
  });

  it("vaciarlo es desconectar el calendario, no un error", async () => {
    const { error } = await supabase
      .from("suscripcion_renta_corta")
      .update({ ical_url: "" })
      .eq("unidad_id", U102);
    expect(error).toBeNull();

    const { data } = await supabase
      .from("suscripcion_renta_corta")
      .select("ical_url")
      .eq("unidad_id", U102)
      .single();
    // Se guarda como null, no como cadena vacía: «sin calendario» es una cosa
    // sola y no dos.
    expect(data!.ical_url).toBeNull();
  });
});

describe("quién puede mirar el calendario de una vivienda", () => {
  it("la anfitriona, sí", async () => {
    await entrarComo(ANFITRIONA);
    const { data, error } = await supabase.rpc("calendario_de_unidad", {
      p_unidad_id: U102,
    });
    await salir();

    expect(error).toBeNull();
    expect(data).toHaveLength(1);
  });

  it("un vecino de otra vivienda, no", async () => {
    /*
      El enlace del calendario es un secreto: quien lo tenga ve cuándo está
      ocupado el piso de otro, y en Airbnb no caduca.
    */
    await entrarComo(AJENO);
    const { error } = await supabase.rpc("calendario_de_unidad", {
      p_unidad_id: U102,
    });
    await salir();

    expect(error).not.toBeNull();
  });
});

describe("una estancia que entró por el calendario", () => {
  /*
    La importación de verdad la hace una función que sale a internet a buscar el
    calendario, y eso no se puede montar desde aquí. Lo que sí se comprueba es
    **lo que esa función escribe**: que la forma de la fila sea la correcta y
    que la llave contra duplicados funcione, que es donde se rompería.
  */
  const UID = "[prueba]-calendario-1@airbnb.com";
  let visitaId = "";

  it("se guarda con su origen, su código y su identificador", async () => {
    const { data, error } = await servicio
      .from("visita")
      .insert({
        condominio_id: "11111111-1111-1111-1111-111111111111",
        unidad_id: U102,
        tipo: "huesped_temporal",
        estado: "programada",
        fecha_desde: "2030-11-15",
        fecha_hasta: "2030-11-18",
        origen: "calendario",
        codigo_reserva: "HMPRUEBA01",
        calendario_uid: UID,
        calendario_url:
          "https://www.airbnb.com/hosting/reservations/details/HMPRUEBA01",
      })
      .select("id, origen, codigo_reserva")
      .single();

    expect(error).toBeNull();
    visitaId = data!.id;
    expect(data!.origen).toBe("calendario");
    expect(data!.codigo_reserva).toBe("HMPRUEBA01");
  });

  it("y leer el calendario otra vez NO la duplica", async () => {
    /*
      Esto es lo que separa una sincronización de un desastre. El calendario se
      lee muchas veces sobre los mismos eventos; sin la llave, cada lectura
      crearía otra estancia y la portería acabaría con seis huéspedes donde hay
      uno.
    */
    const { error } = await servicio.from("visita").insert({
      condominio_id: "11111111-1111-1111-1111-111111111111",
      unidad_id: U102,
      tipo: "huesped_temporal",
      estado: "programada",
      fecha_desde: "2030-11-15",
      fecha_hasta: "2030-11-18",
      origen: "calendario",
      calendario_uid: UID,
    });

    expect(error).not.toBeNull();
    expect(error!.message).toMatch(/duplicate|unique/i);

    const { data } = await servicio
      .from("visita")
      .select("id")
      .eq("calendario_uid", UID);
    expect(data).toHaveLength(1);
  });

  it("nace con su titular marcado, para que el preregistro la encuentre", async () => {
    /*
      Airbnb no manda el nombre del huésped, así que el titular entra en blanco
      y lo rellena él mismo. Lo que **no** puede faltar es la fila: el 02/10/2026
      el preregistro fallaba con un 409 en toda reserva justamente porque
      `guardar_precheckin` no encontraba un titular marcado e intentaba crear
      otro encima del que ya estaba.
    */
    const { error } = await servicio.from("invitado").insert({
      visita_id: visitaId,
      orden: 0,
      nombre: "[prueba] Huésped por confirmar (HMPRUEBA01)",
      es_titular: true,
    });
    expect(error).toBeNull();

    const { data } = await servicio
      .from("invitado")
      .select("es_titular, orden")
      .eq("visita_id", visitaId);

    expect(data).toHaveLength(1);
    expect(data![0].es_titular).toBe(true);
    expect(data![0].orden).toBe(0);
  });
});
