import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { entrarComo, salir, servicio, supabase } from "./cliente";
import { crearVisita, terminarEstancia } from "@/features/visitas/services/visitas.repo";
import {
  anotarRevisionMenor,
  verificarEnPorteria,
} from "@/features/visitas/services/porteria.repo";

/**
 * Recorrido: una estancia de huésped en portería, de la llegada al final
 * (23/10/2026).
 *
 * Lo que pidió el cliente ese día, y que ningún recorrido comprobaba en una
 * estancia:
 *   · un adulto sin el documento verificado no entra; verificado, sí;
 *   · un menor espera a que se verifique su adulto y a que la portería lo
 *     confirme, y lo anotado se puede corregir antes de que entre;
 *   · salir todos antes del día de salida **no** termina la estancia
 *     («Opción B»); la termina el anfitrión, o su fecha.
 *
 * Va en la 205 (Guillermo). La estancia principal empieza mañana, para no pisar
 * la de hoy a mañana de `la-porteria-recibe-al-menor`; la portería ve hoy y
 * mañana, así que la tiene a la vista. Las otras dos son del pasado y se
 * siembran con la clave de servicio, porque nadie puede crear una estancia
 * que ya pasó.
 *
 * En la estancia principal la llegada la marca **el guardia**, con su sesión:
 * la regla del documento no mira a la clave de servicio (con ella se siembra),
 * así que marcarla con esa clave no probaría nada. Se pide la fila de vuelta
 * para saber que de verdad se tocó.
 */

const CONDOMINIO = "11111111-1111-1111-1111-111111111111";
const U205 = "44444444-4444-4444-4444-444444444442";
const ANFITRION = "propietario@veciyo.test"; // Guillermo, de la 205
const GUARDIA = "guardia@veciyo.test";
const MARCA = "[prueba] estancia de punta a punta";

let hoy = "";
const dia = (n: number) => {
  const d = new Date(`${hoy}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
/** Como lo manda el formulario: dd/MM/yyyy. */
const diaDelFormulario = (n: number) => dia(n).split("-").reverse().join("/");

let guillermoId = "";
let visitaId = "";
let adultoA = "";
let adultoB = "";
let nino = "";
const otrasVisitas: string[] = [];

async function marcar(id: string, cambios: Record<string, unknown>) {
  const { data, error } = await servicio
    .from("invitado")
    .update(cambios)
    .eq("id", id)
    .select("id");
  return { error, tocadas: data?.length ?? 0 };
}
/** La llegada como la marca el guardia en la app. */
async function llegarPorPorteria(id: string) {
  await entrarComo(GUARDIA);
  const { data, error } = await supabase
    .from("invitado")
    .update({ llego: true, ingreso_en: new Date().toISOString() })
    .eq("id", id)
    .select("id");
  await salir();
  return { error, tocadas: data?.length ?? 0 };
}
/** En las estancias del pasado, que la portería ya no ve. */
const llegar = (id: string) => marcar(id, { llego: true, ingreso_en: new Date().toISOString() });
const salirDelEdificio = (id: string) => marcar(id, { salida_en: new Date().toISOString() });

async function estadoDe(id: string) {
  const { data } = await servicio
    .from("visita")
    .select("estado, terminada_por, salida_en")
    .eq("id", id)
    .single();
  return data!;
}

/** Una estancia del pasado con un adulto ya verificado, sembrada a mano. */
async function sembrarEstanciaPasada(desde: string, hasta: string, guardiaId: string) {
  const { data: v, error } = await servicio
    .from("visita")
    .insert({
      condominio_id: CONDOMINIO,
      unidad_id: U205,
      tipo: "huesped_temporal",
      fecha_desde: desde,
      fecha_hasta: hasta,
      anotaciones_ingreso: MARCA,
      registrada_por: guillermoId,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  otrasVisitas.push(v!.id);
  const { data: i, error: e2 } = await servicio
    .from("invitado")
    .insert({ visita_id: v!.id, orden: 0, nombre: `${MARCA} pasado`, documento_numero: "900499", tipo_documento: "cedula_ciudadania" })
    .select("id")
    .single();
  if (e2) throw new Error(e2.message);
  const { error: e3 } = await servicio.from("verificacion_documento").insert({
    invitado_id: i!.id,
    estado: "verificado",
    verificado_por: guardiaId,
    verificado_en: new Date().toISOString(),
  });
  if (e3) throw new Error(e3.message);
  return { visita: v!.id, invitado: i!.id };
}

beforeAll(async () => {
  const { data: fecha, error: errorFecha } = await servicio.rpc("hoy_en_el_edificio", {
    p_condominio_id: CONDOMINIO,
  });
  if (errorFecha) throw new Error(errorFecha.message);
  hoy = fecha as string;

  // Una corrida anterior que murió a mitad no deja su estancia ocupando fechas.
  const { data: viejas } = await servicio
    .from("visita")
    .select("id")
    .eq("unidad_id", U205)
    .eq("anotaciones_ingreso", MARCA);
  for (const v of viejas ?? []) await borrarVisita(v.id);

  guillermoId = await entrarComo(ANFITRION);
  visitaId = await crearVisita({
    condominioId: CONDOMINIO,
    unidadId: U205,
    tipo: "huesped_temporal",
    fechaDesde: diaDelFormulario(1),
    fechaHasta: diaDelFormulario(4),
    anotacionesIngreso: MARCA,
    invitados: [
      { nombre: `${MARCA} A`, documentoNumero: "900401", tipoDocumento: "cedula_ciudadania" },
      { nombre: `${MARCA} B`, documentoNumero: "900402", tipoDocumento: "cedula_ciudadania" },
    ],
  });
  await salir();

  const { data: adultos } = await servicio
    .from("invitado")
    .select("id, documento_numero")
    .eq("visita_id", visitaId)
    .order("documento_numero");
  adultoA = adultos![0].id;
  adultoB = adultos![1].id;

  const { data: n, error } = await servicio
    .from("invitado")
    .insert({
      visita_id: visitaId,
      orden: 2,
      nombre: `${MARCA} nino`,
      fecha_nacimiento: "2018-05-05",
      es_menor: true,
      responsable_id: adultoA,
      parentesco: "madre",
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  nino = n!.id;
});

async function borrarVisita(id: string) {
  const { data: invitados } = await servicio.from("invitado").select("id").eq("visita_id", id);
  const ids = (invitados ?? []).map((i) => i.id);
  await servicio.from("notificacion").delete().eq("entidad_id", id);
  if (ids.length) await servicio.from("verificacion_documento").delete().in("invitado_id", ids);
  const { error } = await servicio.from("visita").delete().eq("id", id);
  if (error) throw new Error(`No se pudo borrar la estancia de prueba: ${error.message}`);
}

afterAll(async () => {
  await salir();
  for (const id of [visitaId, ...otrasVisitas].filter(Boolean)) await borrarVisita(id);
});

describe("la entrada de cada persona", () => {
  it("un adulto sin el documento verificado no entra", async () => {
    const { error, tocadas } = await llegarPorPorteria(adultoA);
    expect(error?.message).toMatch(/verificar el documento/i);
    expect(tocadas).toBe(0);
  });

  it("verificado en portería con el número (con puntos), entra", async () => {
    await entrarComo(GUARDIA);
    const coincide = await verificarEnPorteria(adultoA, "900.401");
    await salir();
    expect(coincide).toBe(true);
    const { error, tocadas } = await llegarPorPorteria(adultoA);
    expect(error).toBeNull();
    expect(tocadas).toBe(1);
  });

  it("un menor sin confirmar no entra, aunque su adulto esté verificado", async () => {
    const { error } = await llegarPorPorteria(nino);
    expect(error?.message).toMatch(/menor|confirm/i);
  });

  it("si la portería duda del menor, espera al anfitrión", async () => {
    await entrarComo(GUARDIA);
    await anotarRevisionMenor(nino, "no_se_parece_revisar");
    await salir();
    const { error } = await llegarPorPorteria(nino);
    expect(error?.message).toMatch(/anfitri|revis/i);
  });

  it("lo anotado sobre el menor se corrige antes de que entre, y entonces entra", async () => {
    await entrarComo(GUARDIA);
    await anotarRevisionMenor(nino, "se_parece");
    await salir();
    const { error, tocadas } = await llegarPorPorteria(nino);
    expect(error).toBeNull();
    expect(tocadas).toBe(1);
  });

  it("una vez dentro, lo anotado sobre el menor ya no se cambia", async () => {
    await entrarComo(GUARDIA);
    await expect(anotarRevisionMenor(nino, "no_se_parece_seguro")).rejects.toThrow(/entro|entró/i);
    await salir();
  });
});

describe("la salida no termina la estancia antes de su fecha", () => {
  it("salen todos y la estancia sigue abierta", async () => {
    await entrarComo(GUARDIA);
    expect(await verificarEnPorteria(adultoB, "900402")).toBe(true);
    await salir();
    expect((await llegarPorPorteria(adultoB)).error).toBeNull();

    for (const [quien, id] of [["A", adultoA], ["B", adultoB], ["niño", nino]]) {
      const { error } = await salirDelEdificio(id);
      expect(error ? `${quien}: ${error.message} ${error.details ?? ""}` : null).toBeNull();
    }
    expect((await estadoDe(visitaId)).estado).toBe("ingresada");
  });

  it("al anfitrión no le dice «estancia completa», sino que sigue abierta", async () => {
    const { data } = await servicio
      .from("notificacion")
      .select("titulo, mensaje")
      .eq("entidad_id", visitaId)
      .eq("usuario_id", guillermoId)
      .order("created_at", { ascending: false })
      .limit(1);
    expect(data?.[0]?.titulo).toBe("No queda nadie dentro");
    expect(data?.[0]?.mensaje).toMatch(/sigue abierta/);
  });

  it("vuelven a entrar sin que el guardia tenga que deshacer nada", async () => {
    expect((await marcar(adultoA, { salida_en: null })).error).toBeNull();
    expect((await estadoDe(visitaId)).estado).toBe("ingresada");
  });

  it("la portería no puede terminarla", async () => {
    await entrarComo(GUARDIA);
    await expect(terminarEstancia(visitaId)).rejects.toThrow(/anfitrion/i);
    await salir();
    expect((await estadoDe(visitaId)).estado).toBe("ingresada");
  });

  it("el anfitrión la termina, y quien seguía dentro queda con su salida", async () => {
    await entrarComo(ANFITRION);
    await terminarEstancia(visitaId);
    await salir();
    const estado = await estadoDe(visitaId);
    expect(estado.estado).toBe("finalizada");
    expect(estado.terminada_por).toBe(guillermoId);
    const { data } = await servicio.from("invitado").select("salida_en").eq("id", adultoA).single();
    expect(data?.salida_en).not.toBeNull();
  });
});

describe("la estancia termina en su fecha", () => {
  it("el día de salida, al salir el último, termina", async () => {
    const guardiaId = await entrarComo(GUARDIA);
    await salir();
    const { visita, invitado } = await sembrarEstanciaPasada(dia(-1), dia(0), guardiaId);
    expect((await llegar(invitado)).error).toBeNull();
    expect((await estadoDe(visita)).estado).toBe("ingresada");
    expect((await salirDelEdificio(invitado)).error).toBeNull();
    expect((await estadoDe(visita)).estado).toBe("finalizada");
  });

  it("pasado el día de salida termina sola, aunque nadie marque la salida", async () => {
    const guardiaId = await entrarComo(GUARDIA);
    await salir();
    const { visita, invitado } = await sembrarEstanciaPasada(dia(-4), dia(-2), guardiaId);
    expect((await llegar(invitado)).error).toBeNull();
    // Ya pasó su día: la propia llegada la deja terminada.
    expect((await estadoDe(visita)).estado).toBe("finalizada");

    // Y la tarea de cada hora recoge la que quedó abierta de antes del cambio.
    await servicio.from("visita").update({ estado: "ingresada" }).eq("id", visita);
    const { data: n, error } = await servicio.rpc("terminar_estancias_vencidas");
    expect(error).toBeNull();
    expect(n as number).toBeGreaterThanOrEqual(1);
    expect((await estadoDe(visita)).estado).toBe("finalizada");
  });
});
