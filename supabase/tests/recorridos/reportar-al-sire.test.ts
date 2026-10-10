import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { CLAVE, URL, enDias, entrarComo, salir, servicio, supabase, ventanaDe } from "./cliente";
import { crearVisita } from "@/features/visitas/services/visitas.repo";

/** Sus fechas, lejos de las de los demas: ver `ventanaDe`. */
const V = ventanaDe("reportar-al-sire");

/**
 * Recorrido: el reporte de extranjeros a Migración Colombia (SIRE).
 *
 * El SIRE **no tiene API**: se reporta subiendo un archivo plano al portal, y
 * el formato exacto está en un instructivo que solo se baja con cuenta. Así que
 * lo que se puede construir hoy —y lo que esto comprueba— es la parte que de
 * verdad vale y que sí está documentada en el ABC público:
 *
 *   · **a quién hay que reportar**: extranjeros, y solo si el edificio está en
 *     Colombia;
 *   · **qué le falta a cada uno** antes de que llegue.
 *
 * Importa acertar: no reportar tiene multas de 5 a 131 millones de pesos, y
 * reportar a un colombiano es meterlo en un registro de extranjeros.
 */

const CONDOMINIO = "11111111-1111-1111-1111-111111111111";
const U102 = "44444444-4444-4444-4444-444444444443";
const ANFITRIONA = "vecino@veciyo.test";

const MARCA = "[prueba] recorrido SIRE";

let visitaId = "";
let colombiana = "";
let peruano = "";

async function reportar(momento: "entrada" | "salida" = "entrada") {
  const { data: sesion } = await supabase.auth.getSession();
  const respuesta = await fetch(`${URL}/functions/v1/reportar-sire`, {
    method: "POST",
    headers: {
      apikey: CLAVE,
      Authorization: `Bearer ${sesion.session?.access_token ?? ""}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ visitaId, momento }),
  });
  return { estado: respuesta.status, cuerpo: await respuesta.json() };
}

beforeAll(async () => {
  await entrarComo(ANFITRIONA);

  visitaId = await crearVisita({
    condominioId: CONDOMINIO,
    unidadId: U102,
    tipo: "huesped_temporal",
    fechaDesde: enDias(V + 5),
    fechaHasta: enDias(V + 9),
    anotacionesIngreso: MARCA,
    invitados: [{ nombre: `${MARCA} Marcela` }, { nombre: `${MARCA} Bruno` }],
  });

  const { data } = await supabase
    .from("invitado")
    .select("id, es_titular")
    .eq("visita_id", visitaId)
    .order("orden");
  colombiana = data!.find((i) => i.es_titular)!.id;
  peruano = data!.find((i) => !i.es_titular)!.id;
});

afterAll(async () => {
  const { error: errorReportes } = await servicio
    .from("reporte_legal")
    .delete()
    .in("invitado_id", [colombiana, peruano].filter(Boolean));
  if (errorReportes) throw new Error(`No se pudieron retirar los reportes: ${errorReportes.message}`);

  const { error } = await servicio.from("visita").delete().eq("id", visitaId);
  if (error) throw new Error(`No se pudo retirar la visita: ${error.message}`);
  await salir();
});

describe("cuando nadie dijo de dónde es", () => {
  it("no adivina, y avisa de a quién le falta", async () => {
    /*
      Suponer la nacionalidad por el tipo de documento parece razonable y es
      falso: un colombiano puede entrar con pasaporte. Equivocarse es, o no
      reportar a quien tocaba, o meter a un nacional en un registro de
      extranjeros.
    */
    await entrarComo(ANFITRIONA);
    const { estado, cuerpo } = await reportar();

    expect(estado).toBe(200);
    expect(cuerpo.reportables).toBe(0);
    expect(cuerpo.avisos).toHaveLength(2);
    expect(cuerpo.avisos[0]).toContain("nacionalidad");
  });
});

describe("con las nacionalidades puestas", () => {
  beforeAll(async () => {
    await entrarComo(ANFITRIONA);

    await supabase
      .from("invitado")
      .update({
        nombre: "Marcela",
        apellidos: "Sierra",
        tipo_documento: "cedula_ciudadania",
        documento_numero: "52000111",
        fecha_nacimiento: "1985-04-10",
        nacionalidad: "CO",
      })
      .eq("id", colombiana);

    await supabase
      .from("invitado")
      .update({
        nombre: "Bruno",
        apellidos: "Salas",
        tipo_documento: "pasaporte",
        documento_numero: "XP998877",
        fecha_nacimiento: "1990-02-20",
        nacionalidad: "PE",
      })
      .eq("id", peruano);
  });

  it("reporta al extranjero y deja fuera a la colombiana", async () => {
    await entrarComo(ANFITRIONA);
    const { estado, cuerpo } = await reportar();

    expect(estado).toBe(200);
    expect(cuerpo.reportables).toBe(1);
    expect(cuerpo.archivo).toContain("XP998877");
    // La colombiana no va: no es extranjera.
    expect(cuerpo.archivo).not.toContain("52000111");
  });

  it("y dice, dentro del propio archivo, que el formato está sin confirmar", async () => {
    /*
      Esta es la diferencia entre una simulación honesta y un servicio que
      finge. Quien suba esto al portal tiene que saber que es un borrador.
    */
    await entrarComo(ANFITRIONA);
    const { cuerpo } = await reportar();

    expect(cuerpo.enviado).toBe(false);
    expect(cuerpo.archivo).toContain("PROVISIONAL");
    expect(cuerpo.motivo).toContain("no tiene API");
  });

  it("la salida es un reporte distinto del de la entrada", async () => {
    /*
      El SIRE pide los dos movimientos. Si entrada y salida se guardaran como
      uno, el edificio quedaría con gente que entró y nunca se fue.
    */
    await entrarComo(ANFITRIONA);
    await reportar("entrada");
    await reportar("salida");

    const { data } = await servicio
      .from("reporte_legal")
      .select("momento, estado, tipo")
      .eq("invitado_id", peruano)
      .eq("tipo", "sire");

    expect(data).toHaveLength(2);
    expect(data!.map((r) => r.momento).sort()).toEqual(["entrada", "salida"]);
    for (const fila of data!) expect(fila.estado).toBe("simulado");
  });

  it("y de la colombiana no queda ninguna constancia", async () => {
    // Control del caso de arriba: que no se haya reportado a quien no tocaba.
    const { data } = await servicio
      .from("reporte_legal")
      .select("id")
      .eq("invitado_id", colombiana)
      .eq("tipo", "sire");
    expect(data).toEqual([]);
  });

  it("si al extranjero le falta la fecha de nacimiento, no deja seguir", async () => {
    await entrarComo(ANFITRIONA);
    await supabase
      .from("invitado")
      .update({ fecha_nacimiento: null })
      .eq("id", peruano);

    const { estado, cuerpo } = await reportar();
    expect(estado).toBe(400);
    expect(JSON.stringify(cuerpo.faltas)).toContain("fecha de nacimiento");

    // Y se devuelve, que si no el siguiente caso que corra se la encuentra rota.
    await supabase
      .from("invitado")
      .update({ fecha_nacimiento: "1990-02-20" })
      .eq("id", peruano);
  });
});
