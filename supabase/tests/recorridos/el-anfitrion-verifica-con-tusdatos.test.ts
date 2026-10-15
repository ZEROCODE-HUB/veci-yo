import { afterAll, beforeAll, describe, expect, it, type TestContext } from "vitest";
import { enDias, entrarComo, salir, servicio, supabase, ventanaDe } from "./cliente";
import { crearVisita } from "@/features/visitas/services/visitas.repo";

/** Sus fechas, lejos de las de los demas: ver `ventanaDe`. */
const V = ventanaDe("el-anfitrion-verifica-con-tusdatos");

/**
 * Recorrido: la verificación de antecedentes contra tusdatos, de punta a punta.
 *
 * Llama a la función desplegada, que llama a su **ambiente de pruebas** --gratis
 * y con respuestas fijas-- y comprueba lo que queda escrito en la base. Los
 * documentos son los de ejemplo que ellos publican: 111 trae hallazgos, 112
 * sale limpio, 113 falla en todas las fuentes y 128 es de alguien que prohibió
 * que lo consulten.
 *
 * Existe porque la primera versión de la integración se escribió leyendo su
 * documentación y **no llegó a correr ni una vez**: leía un campo que no viene
 * y, peor, el resultado no se podía escribir --`anotar_verificacion` solo
 * inserta, y la fila ya estaba--. Las dos cosas salieron al llamarlos.
 *
 * ----------------------------------------------------------------------------
 * Esta prueba no gasta dinero, y se asegura antes de empezar
 * ----------------------------------------------------------------------------
 * En producción cada consulta cuesta créditos. El `beforeAll` hace una llamada
 * que **no llega a tusdatos** --una cédula de extranjería sin fecha de
 * expedición, que la función rechaza antes de salir-- y lee contra qué ambiente
 * está la función. Si no es el de pruebas, o está apagada, todos los casos se
 * saltan diciendo por qué.
 */

const CONDOMINIO = "11111111-1111-1111-1111-111111111111";
const U102 = "44444444-4444-4444-4444-444444444443";
const ANFITRIONA = "vecino@veciyo.test"; // Sofía, de la 102
const AJENO = "propietario@veciyo.test";

const MARCA = "[prueba] tusdatos";

/** El jobid de su consulta limpia de ejemplo: el de la 112. */
const TAREA_LIMPIA = "5c6c80c0-4dd3-41c9-9648-46871a7176ad";

const PERSONAS = [
  { clave: "conHallazgos", documento: "111", tipo: "cedula_ciudadania" },
  { clave: "limpia", documento: "112", tipo: "cedula_ciudadania" },
  { clave: "todoCaido", documento: "113", tipo: "cedula_ciudadania" },
  { clave: "noAutoriza", documento: "128", tipo: "cedula_ciudadania" },
  { clave: "sinFecha", documento: "960696", tipo: "cedula_extranjeria" },
  { clave: "pendiente", documento: "112", tipo: "cedula_ciudadania" },
  { clave: "simulada", documento: "111", tipo: "cedula_ciudadania" },
] as const;

type Clave = (typeof PERSONAS)[number]["clave"];

let visitaId = "";
const invitado = {} as Record<Clave, string>;
/** Por qué se saltan los casos, o vacío si se pueden correr. */
let noSePuede = "";

interface Respuesta {
  consultado?: boolean;
  estado?: string;
  motivo?: string;
  causa?: string;
  nivel?: string | null;
  jobid?: string;
  proveedor?: string;
  noSeAnoto?: string | null;
}

async function verificar(clave: Clave): Promise<Respuesta> {
  const { data, error } = await supabase.functions.invoke("verificar-antecedentes", {
    body: { invitadoId: invitado[clave] },
  });
  if (error) throw error;
  return data as Respuesta;
}

async function fila(clave: Clave) {
  const { data, error } = await servicio
    .from("verificacion_antecedentes")
    .select("id, proveedor, resultado, referencia_externa, respuesta")
    .eq("invitado_id", invitado[clave])
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

async function cuantasFilas(): Promise<number> {
  const { count, error } = await servicio
    .from("verificacion_antecedentes")
    .select("id", { count: "exact", head: true })
    .in("invitado_id", Object.values(invitado));
  if (error) throw new Error(error.message);
  return count ?? 0;
}

function saltarSiNoSePuede(ctx: TestContext) {
  if (noSePuede) ctx.skip(noSePuede);
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
    invitados: PERSONAS.map((p) => ({
      nombre: `${MARCA} ${p.clave}`,
      documentoNumero: p.documento,
      tipoDocumento: p.tipo,
    })),
  });

  const { data, error } = await supabase
    .from("invitado")
    .select("id, nombre")
    .eq("visita_id", visitaId);
  if (error) throw new Error(error.message);
  for (const p of PERSONAS) {
    const suyo = data!.find((i) => i.nombre === `${MARCA} ${p.clave}`);
    if (!suyo) throw new Error(`No se creó el invitado ${p.clave}`);
    invitado[p.clave] = suyo.id;
  }

  // La llamada que no sale a internet, para saber con quién se habla.
  const sonda = await verificar("sinFecha");
  if (sonda.proveedor !== "tusdatos-pruebas") {
    noSePuede = sonda.proveedor
      ? `La función apunta a «${sonda.proveedor}», no al ambiente de pruebas: correr esto gastaría créditos`
      : `La verificación está apagada: ${sonda.motivo ?? "sin motivo"}`;
  }
}, 60_000);

afterAll(async () => {
  // Los avisos al anfitrion que dispararon sus verificaciones (14/10/2026).
  if (visitaId) await servicio.from("notificacion").delete().eq("entidad_id", visitaId);
  /*
    Las verificaciones apuntan al invitado con RESTRICT --son constancia de un
    hecho y de un cobro-- y no tienen política de baja: se retiran con la
    escoba, antes que la visita, y mirando si se retiraron.
  */
  const ids = Object.values(invitado);
  if (ids.length > 0) {
    const { error } = await servicio
      .from("verificacion_antecedentes")
      .delete()
      .in("invitado_id", ids);
    if (error) throw new Error(`No se pudieron retirar las verificaciones: ${error.message}`);
  }
  if (visitaId) {
    const { error } = await servicio.from("visita").delete().eq("id", visitaId);
    if (error) throw new Error(`No se pudo retirar la visita: ${error.message}`);
  }
  await salir();
});

describe("el anfitrión verifica a sus huéspedes con tusdatos (ambiente de pruebas)", () => {
  it("lo que no se puede consultar no gasta un cupo ni se aprueba", async (ctx) => {
    saltarSiNoSePuede(ctx);
    // Es la sonda del `beforeAll`: extranjería sin fecha de expedición.
    const r = await verificar("sinFecha");
    expect(r.consultado).toBe(false);
    expect(r.motivo).toMatch(/fecha de expedición/i);
    expect(await fila("sinFecha")).toBeNull();
  });

  it("con hallazgos altos queda marcada, y se guarda el reporte", async (ctx) => {
    saltarSiNoSePuede(ctx);
    const r = await verificar("conHallazgos");
    expect(r.consultado).toBe(true);
    expect(r.estado).toBe("rechazada");
    expect(r.nivel).toBe("alto");
    expect(r.noSeAnoto).toBeNull();

    const f = await fila("conHallazgos");
    expect(f?.resultado).toBe("rechazada");
    // Nunca `tusdatos` a secas: lo del ambiente de pruebas no es una verificación.
    expect(f?.proveedor).toBe("tusdatos-pruebas");
    expect(f?.referencia_externa).toBe(r.jobid);
    expect((f?.respuesta as { reporteId?: string }).reporteId).toBe("651c2ede72476080772781f5");
  }, 60_000);

  it("limpia queda aprobada, y pedirla otra vez no vuelve a consultar", async (ctx) => {
    saltarSiNoSePuede(ctx);
    const r = await verificar("limpia");
    expect(r.estado).toBe("aprobada");
    expect((await fila("limpia"))?.resultado).toBe("aprobada");

    const otra = await verificar("limpia");
    expect(otra.consultado).toBe(false);
    expect(otra.estado).toBe("aprobada");
  }, 60_000);

  it("con las fuentes caídas NO se aprueba, aunque tusdatos diga «sin hallazgos»", async (ctx) => {
    saltarSiNoSePuede(ctx);
    const r = await verificar("todoCaido");
    expect(r.estado).toBe("error_proveedor");
    expect(r.motivo).toMatch(/incompleta/i);

    const f = await fila("todoCaido");
    expect(f?.resultado).toBe("error_proveedor");
    expect((f?.respuesta as { fuentesConError: string[] }).fuentesConError).toContain("policia");
  }, 60_000);

  it("quien prohibió que lo consulten no queda aprobado", async (ctx) => {
    saltarSiNoSePuede(ctx);
    const r = await verificar("noAutoriza");
    expect(r.consultado).toBe(false);
    expect(r.causa).toBe("titular");

    const f = await fila("noAutoriza");
    expect(f?.resultado).toBe("error_proveedor");
  }, 60_000);

  it("una consulta que quedó pendiente se recoge sin lanzar otra", async (ctx) => {
    saltarSiNoSePuede(ctx);
    /*
      Así queda la fila cuando la consulta tarda más que la espera: pendiente,
      con el identificador de la tarea. Volver a llamar tiene que preguntar por
      **esa** tarea --ya pagada-- y no lanzar una nueva.
    */
    const { error } = await servicio.rpc("anotar_verificacion", {
      p_invitado_id: invitado.pendiente,
      p_proveedor: "tusdatos-pruebas",
      p_referencia: TAREA_LIMPIA,
      p_resultado: "pendiente",
      p_respuesta: { jobid: TAREA_LIMPIA },
    });
    expect(error).toBeNull();

    const r = await verificar("pendiente");
    expect(r.jobid).toBe(TAREA_LIMPIA);
    expect(r.estado).toBe("aprobada");
    expect((await fila("pendiente"))?.resultado).toBe("aprobada");
  }, 60_000);

  it("la simulada del preregistro deja su sitio a la de verdad, sin gastar otro cupo", async (ctx) => {
    saltarSiNoSePuede(ctx);
    // Lo que deja `cerrar_precheckin` hoy: aprobada, de proveedor `simulado`.
    const { data: idSimulada, error } = await servicio.rpc("anotar_verificacion", {
      p_invitado_id: invitado.simulada,
      p_proveedor: "simulado",
      p_resultado: "aprobada",
    });
    expect(error).toBeNull();
    const antes = await cuantasFilas();

    const r = await verificar("simulada");
    expect(r.estado).toBe("rechazada");

    const f = await fila("simulada");
    expect(f?.id).toBe(idSimulada);
    expect(f?.proveedor).toBe("tusdatos-pruebas");
    expect(f?.resultado).toBe("rechazada");
    expect(await cuantasFilas()).toBe(antes);
  }, 60_000);

  it("quien no es el anfitrión no puede pedirla", async (ctx) => {
    saltarSiNoSePuede(ctx);
    await salir();
    await entrarComo(AJENO);
    const { error } = await supabase.functions.invoke("verificar-antecedentes", {
      body: { invitadoId: invitado.conHallazgos },
    });
    expect((error as { context?: { status?: number } } | null)?.context?.status).toBe(403);
    await salir();
    await entrarComo(ANFITRIONA);
  }, 60_000);
});
