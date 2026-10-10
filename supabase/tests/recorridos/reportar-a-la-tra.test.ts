import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { enDias, entrarComo, salir, servicio, supabase, URL, CLAVE, ventanaDe } from "./cliente";
import { crearVisita } from "@/features/visitas/services/visitas.repo";

/** Sus fechas, lejos de las de los demas: ver `ventanaDe`. */
const V = ventanaDe("reportar-a-la-tra");

/**
 * Recorrido: el reporte al ministerio (TRA), en modo prueba.
 *
 * La Tarjeta de Registro de Alojamiento es obligatoria —Resolución 409 de 2022—
 * y no reportarla tiene multa. El token lo saca cada anfitrión con su número de
 * RNT, así que **hasta que exista uno real esto no puede salir a internet**.
 *
 * Por eso la función, sin token, arma el reporte entero y lo devuelve en vez de
 * fallar: es la misma decisión que `enviar-correo` toma con el SMTP. Lo que se
 * comprueba aquí es que lo que se habría mandado **es correcto**, que es lo
 * único que se puede saber antes de tener credenciales.
 *
 * Y una cosa más, que es la que de verdad importa: **que no deje reportar a
 * medias**. Un reporte al Estado con la ciudad en blanco se acepta y queda mal
 * declarado; deshacerlo no se hace por API.
 */

const CONDOMINIO = "11111111-1111-1111-1111-111111111111";
const U102 = "44444444-4444-4444-4444-444444444443";
const ANFITRIONA = "vecino@veciyo.test";
const AJENO = "propietario@veciyo.test";

const MARCA = "[prueba] recorrido TRA";

let visitaId = "";
let titularId = "";
let acompananteId = "";

/** Lo que había en la suscripción, para dejarlo igual. */
let rntOriginal: string | null = null;

/** Llama a la función desplegada con la sesión de quien se le pase. */
async function reportar(visita: string) {
  const { data: sesion } = await supabase.auth.getSession();
  const token = sesion.session?.access_token ?? "";
  const respuesta = await fetch(`${URL}/functions/v1/reportar-tra`, {
    method: "POST",
    headers: {
      apikey: CLAVE,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ visitaId: visita }),
  });
  return { estado: respuesta.status, cuerpo: await respuesta.json() };
}

beforeAll(async () => {
  await entrarComo(ANFITRIONA);

  const { data: suscripcion } = await supabase
    .from("suscripcion_renta_corta")
    .select("rnt")
    .eq("unidad_id", U102)
    .maybeSingle();
  rntOriginal = suscripcion?.rnt ?? null;

  visitaId = await crearVisita({
    condominioId: CONDOMINIO,
    unidadId: U102,
    tipo: "huesped_temporal",
    fechaDesde: enDias(V + 5),
    fechaHasta: enDias(V + 9),
    anotacionesIngreso: MARCA,
    invitados: [
      { nombre: `${MARCA} Camila` },
      { nombre: `${MARCA} Acompanante` },
    ],
  });

  const { data: invitados } = await supabase
    .from("invitado")
    .select("id, es_titular")
    .eq("visita_id", visitaId)
    .order("orden");
  titularId = invitados!.find((i) => i.es_titular)!.id;
  acompananteId = invitados!.find((i) => !i.es_titular)!.id;
});

afterAll(async () => {
  /*
    Los reportes apuntan al invitado con RESTRICT --son constancia de un hecho--
    asi que hay que retirarlos antes que la visita, y con la escoba, porque
    `reporte_legal` no tiene politica de baja a proposito.
  */
  const { error: errorReportes } = await servicio
    .from("reporte_legal")
    .delete()
    .in("invitado_id", [titularId, acompananteId].filter(Boolean));
  if (errorReportes) throw new Error(`No se pudieron retirar los reportes: ${errorReportes.message}`);

  /*
    Y las verificaciones de antecedentes, por el **mismo motivo**: también
    apuntan al invitado con RESTRICT. Esta prueba no pide ninguna, así que
    durante meses no hizo falta... hasta que una apareció.

    Pasó el 06/10/2026, y la causa fue mía: estaba probando a mano la
    integración de antecedentes **mientras la suite corría**, elegí «un
    invitado de la 102 sin verificación» y resultó ser el titular que este
    archivo acababa de crear. El `afterAll` no pudo borrar la visita y el
    archivo entero se cayó --sin una sola prueba roja: 841 en verde y un
    archivo caído, que es la forma que no se nota--.

    Lo que pasó es la regla de siempre --no tocar la base mientras corre la
    suite-- incumplida por mí. Pero el agujero estaba: cualquier cosa que
    verifique a este huésped deja la visita sin poderse borrar, y entonces la
    siguiente corrida arrastra basura. Se tapa aquí, igual que `reporte_legal`.
  */
  const { error: errorVerif } = await servicio
    .from("verificacion_antecedentes")
    .delete()
    .in("invitado_id", [titularId, acompananteId].filter(Boolean));
  if (errorVerif) {
    throw new Error(`No se pudieron retirar las verificaciones: ${errorVerif.message}`);
  }

  const { error } = await servicio.from("visita").delete().eq("id", visitaId);
  if (error) throw new Error(`No se pudo retirar la visita: ${error.message}`);

  await servicio
    .from("suscripcion_renta_corta")
    .update({ rnt: rntOriginal })
    .eq("unidad_id", U102);

  await salir();
});

describe("antes de mandar nada al ministerio", () => {
  it("no se reporta a quien todavía no ha entrado", async () => {
    /*
      Decidido con el cliente el 09/10/2026 (KT 4.2.6): es la portería la que
      marca la entrada, y solo entonces se puede declarar la estancia.
      Reportar antes sería decirle al ministerio que alguien se alojó cuando
      todavía no ha llegado.
    */
    await entrarComo(ANFITRIONA);
    const { estado } = await reportar(visitaId);
    expect(estado).toBe(409);

    // Lo que deja la portería al marcar la llegada. El resto del archivo
    // parte de aquí.
    const { error } = await servicio
      .from("visita")
      .update({ ingreso_en: new Date().toISOString() })
      .eq("id", visitaId);
    expect(error).toBeNull();
  });

  it("no deja reportar si falta algo, y dice todo lo que falta de una vez", async () => {
    /*
      El huésped acaba de llegar al preregistro y no ha llenado nada. Si esto
      saliera a internet, el ministerio recibiría una estancia con la ciudad en
      blanco y quedaría mal declarada.

      Y las dice todas juntas: el error del ministerio no distingue qué campo
      está mal, así que de una en una harían falta cinco intentos.
    */
    await entrarComo(ANFITRIONA);
    const { estado, cuerpo } = await reportar(visitaId);

    expect(estado).toBe(400);
    expect(cuerpo.faltan.length).toBeGreaterThan(1);
    expect(cuerpo.error).toContain("falta");
  });

  it("y no deja ni un reporte a medias escrito", async () => {
    // Control: que rechazar no haya dejado filas sueltas en la constancia.
    const { data } = await servicio
      .from("reporte_legal")
      .select("id")
      .eq("invitado_id", titularId);
    expect(data).toEqual([]);
  });
});

describe("con la ficha completa, en modo prueba", () => {
  beforeAll(async () => {
    await entrarComo(ANFITRIONA);

    // El RNT del alojamiento, que es del anfitrión.
    await supabase
      .from("suscripcion_renta_corta")
      .update({ rnt: "[prueba]99887" })
      .eq("unidad_id", U102);

    // Lo que el huésped habría llenado en su preregistro.
    await supabase
      .from("invitado")
      .update({
        nombre: "Camila",
        apellidos: "Rojas",
        tipo_documento: "cedula_ciudadania",
        documento_numero: "1020304050",
        ciudad_residencia: "Medellín",
        ciudad_procedencia: "Lima",
        motivo: "turismo",
      })
      .eq("id", titularId);

    await supabase
      .from("invitado")
      .update({
        nombre: "Bruno",
        apellidos: "Salas",
        tipo_documento: "pasaporte",
        documento_numero: "XP998877",
        ciudad_residencia: "Lima",
        ciudad_procedencia: "Lima",
      })
      .eq("id", acompananteId);

    await supabase
      .from("visita")
      .update({ costo_estancia: 850000, moneda_costo: "COP" })
      .eq("id", visitaId);
  });

  it("arma el reporte y NO sale a internet: está en simulación", async () => {
    await entrarComo(ANFITRIONA);
    const { estado, cuerpo } = await reportar(visitaId);

    expect(estado).toBe(200);
    // Lo importante: dice que no se envió, y dice por qué.
    expect(cuerpo.enviado).toBe(false);
    // Desde el 09/10/2026 el envio esta apagado para todos, tengan token o
    // no: lo decidio el cliente mientras el TRA sea su cuenta real.
    expect(cuerpo.motivo).toContain("simulación");
  });

  it("y lo que se habría mandado es lo que pide la resolución", async () => {
    await entrarComo(ANFITRIONA);
    const { cuerpo } = await reportar(visitaId);

    const principal = cuerpo.principal;
    expect(principal.nombres).toBe("Camila");
    expect(principal.tipo_identificacion).toBe("C.C");
    expect(principal.numero_identificacion).toBe("1020304050");
    expect(principal.rnt_establecimiento).toBe("[prueba]99887");
    expect(principal.costo).toBe("850000");
    expect(principal.numero_habitacion).toBe("102");
    // Un acompañante, y se declara en el principal.
    expect(principal.numero_acompanantes).toBe("1");

    /*
      Con la errata del ministerio. Si alguien «arregla» la ortografía, el
      reporte se acepta igual y la ciudad llega vacía: por eso se comprueba
      aquí, en el cuerpo que de verdad saldría, y no solo en las unitarias.
    */
    expect(principal.cuidad_residencia).toBe("Medellín");
    expect(principal).not.toHaveProperty("ciudad_residencia");
  });

  it("el acompañante va aparte y colgado del principal", async () => {
    await entrarComo(ANFITRIONA);
    const { cuerpo } = await reportar(visitaId);

    expect(cuerpo.acompanantes).toHaveLength(1);
    expect(cuerpo.acompanantes[0].nombres).toBe("Bruno");
    expect(cuerpo.acompanantes[0].tipo_identificacion).toBe("Pasaporte");
    // En modo prueba el `padre` todavía no existe: lo devuelve el ministerio.
    expect(cuerpo.acompanantes[0]).toHaveProperty("padre");
  });

  it("y queda la constancia de lo que se armó, por huésped", async () => {
    /*
      `reporte_legal` existía desde el primer día y nunca guardó nada. Lo que le
      faltaba no era el envío: era **guardar lo que se mandó**. Un reporte al
      Estado del que solo se sabe que «fue bien» no sirve de constancia el día
      que alguien pregunte qué se declaró.
    */
    const { data } = await servicio
      .from("reporte_legal")
      .select("invitado_id, tipo, estado, enviado, rnt_referencia")
      .in("invitado_id", [titularId, acompananteId]);

    expect(data).toHaveLength(2);
    for (const fila of data!) {
      expect(fila.tipo).toBe("tra");
      expect(fila.estado).toBe("simulado");
      expect(fila.rnt_referencia).toBe("[prueba]99887");
      // El cuerpo entero, no un resumen.
      expect(fila.enviado).toHaveProperty("cuidad_residencia");
    }
  });

  it("reportar dos veces no duplica la constancia", async () => {
    await entrarComo(ANFITRIONA);
    await reportar(visitaId);

    const { data } = await servicio
      .from("reporte_legal")
      .select("id")
      .in("invitado_id", [titularId, acompananteId]);
    expect(data).toHaveLength(2);
  });
});

describe("quién puede reportar", () => {
  it("un vecino de otra vivienda, no", async () => {
    /*
      El reporte sale con el RNT del anfitrión: quien lo mande está declarando
      al ministerio en nombre de otro. No es un dato más.
    */
    await entrarComo(AJENO);
    const { estado } = await reportar(visitaId);
    await salir();

    expect(estado).toBe(403);
  });

  it("y sin sesión, tampoco", async () => {
    const respuesta = await fetch(`${URL}/functions/v1/reportar-tra`, {
      method: "POST",
      headers: { apikey: CLAVE, "Content-Type": "application/json" },
      body: JSON.stringify({ visitaId }),
    });
    expect(respuesta.status).toBeGreaterThanOrEqual(400);
  });
});
