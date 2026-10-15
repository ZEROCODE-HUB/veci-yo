import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { enDias, entrarComo, salir, servicio, supabase, ventanaDe } from "./cliente";
import {
  abrirInformeAntecedentes,
  crearVisita,
  obtenerVisitas,
  resolverRevisionManual,
} from "@/features/visitas/services/visitas.repo";

/** Sus fechas, lejos de las de los demas: ver `ventanaDe`. */
const V = ventanaDe("el-anfitrion-revisa-a-mano");

/**
 * Recorrido: la revisión manual del anfitrión (14/10/2026).
 *
 * Lo pidió la responsable de producto: con un hallazgo en el informe, con una
 * consulta que no se pudo hacer, o con una incapacidad declarada por el
 * titular, la estancia «requiere aprobación manual». El anfitrión ve el
 * informe --con la marca de no compartir-- y decide; queda anotado quién y
 * cuándo. Un «no autorizar» cierra la puerta de la portería.
 *
 * Las verificaciones se siembran con la clave de servicio: lo que se prueba
 * aquí es la decisión, no la consulta a Tus Datos (eso es de
 * `el-anfitrion-verifica-con-tusdatos`).
 */

const CONDOMINIO = "11111111-1111-1111-1111-111111111111";
const U102 = "44444444-4444-4444-4444-444444444443";
const ANFITRIONA = "vecino@veciyo.test"; // Sofía, de la 102
const AJENO = "propietario@veciyo.test"; // Guillermo, de otras viviendas

const MARCA = "[prueba] revision";
const PERSONAS = ["limpia", "hallazgo", "sinConsulta", "incapaz", "simulada"] as const;
type Clave = (typeof PERSONAS)[number];

let visitaId = "";
let sofiaId = "";
const invitado = {} as Record<Clave, string>;

async function sembrar(clave: Clave, proveedor: string, resultado: string, respuesta: unknown) {
  const { error } = await servicio.rpc("anotar_verificacion", {
    p_invitado_id: invitado[clave],
    p_proveedor: proveedor,
    p_referencia: null,
    p_resultado: resultado,
    p_respuesta: respuesta,
  });
  if (error) throw new Error(`No se pudo sembrar ${clave}: ${error.message}`);
}

async function estadoEnLaPantalla(clave: Clave) {
  const visitas = await obtenerVisitas({ ambito: "unidad", unidadIds: [U102] });
  const visita = visitas.find((v) => v.uuid === visitaId);
  return visita?.invitados?.find((i) => i.uuid === invitado[clave]);
}

beforeAll(async () => {
  await entrarComo(ANFITRIONA);
  sofiaId = (await supabase.auth.getUser()).data.user!.id;
  visitaId = await crearVisita({
    condominioId: CONDOMINIO,
    unidadId: U102,
    tipo: "huesped_temporal",
    fechaDesde: enDias(V + 3),
    fechaHasta: enDias(V + 6),
    anotacionesIngreso: MARCA,
    invitados: PERSONAS.map((p, i) => ({
      nombre: `${MARCA} ${p}`,
      documentoNumero: String(900100 + i),
      tipoDocumento: "cedula_ciudadania",
    })),
  });

  const { data, error } = await supabase
    .from("invitado")
    .select("id, nombre")
    .eq("visita_id", visitaId);
  if (error) throw new Error(error.message);
  for (const p of PERSONAS) {
    const suyo = data!.find((i) => i.nombre === `${MARCA} ${p}`);
    if (!suyo) throw new Error(`No se creó el invitado ${p}`);
    invitado[p] = suyo.id;
  }

  await sembrar("limpia", "tusdatos-pruebas", "aprobada", { nivel: "bajo" });
  await sembrar("hallazgo", "tusdatos-pruebas", "rechazada", {
    nivel: "alto",
    reporteId: "000000000000000000000000",
    motivo: "Hallazgos de nivel alto",
  });
  await sembrar("sinConsulta", "tusdatos-pruebas", "error_proveedor", { causa: "titular" });
  await sembrar("incapaz", "tusdatos-pruebas", "aprobada", { nivel: "bajo" });
  await sembrar("simulada", "simulado", "rechazada", {});

  // La declaración la hizo el titular: aquí basta con que conste quién.
  const { error: errorIncapaz } = await servicio
    .from("invitado")
    .update({
      incapacidad_declarado_por_invitado_id: invitado.limpia,
      incapacidad_motivo: MARCA,
      incapacidad_declaracion: MARCA,
      incapacidad_declarado_en: new Date().toISOString(),
      terminos_excepcion: true,
    })
    .eq("id", invitado.incapaz);
  if (errorIncapaz) throw new Error(errorIncapaz.message);
}, 60_000);

afterAll(async () => {
  // Los avisos al anfitrion que dispararon sus verificaciones (14/10/2026).
  if (visitaId) await servicio.from("notificacion").delete().eq("entidad_id", visitaId);
  const ids = Object.values(invitado);
  await servicio.storage.from("antecedentes").remove(ids.map((id) => `${visitaId}/${id}.pdf`));
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

describe("cuándo hace falta la decisión del anfitrión", () => {
  it("una limpia no la necesita, y la pantalla la da por superada", async () => {
    await entrarComo(ANFITRIONA);
    await expect(
      resolverRevisionManual({ invitadoUuid: invitado.limpia, aprobar: true }),
    ).rejects.toThrow(/no necesita revision/i);
    expect((await estadoEnLaPantalla("limpia"))?.verificacion).toBe("aprobada");
  });

  it("un hallazgo, una consulta imposible y una incapacidad sí", async () => {
    await entrarComo(ANFITRIONA);
    const hallazgo = await estadoEnLaPantalla("hallazgo");
    expect(hallazgo?.verificacion).toBe("revision");
    expect(hallazgo?.motivoRevision).toBe("hallazgo");
    expect(hallazgo?.tieneInforme).toBe(true);
    expect((await estadoEnLaPantalla("sinConsulta"))?.motivoRevision).toBe("sin_consulta");
    expect((await estadoEnLaPantalla("incapaz"))?.motivoRevision).toBe("incapacidad");
  });
});

describe("quién decide", () => {
  it("alguien que no es el anfitrión, no", async () => {
    await entrarComo(AJENO);
    await expect(
      resolverRevisionManual({ invitadoUuid: invitado.hallazgo, aprobar: true }),
    ).rejects.toThrow(/solo el anfitrion/i);
  });

  it("nadie la escribe por la puerta de atrás, ni el propio anfitrión", async () => {
    await entrarComo(ANFITRIONA);
    const { error } = await supabase
      .from("invitado")
      .update({ revision_anfitrion: "aprobada" })
      .eq("id", invitado.hallazgo);
    expect(error?.message ?? "").toMatch(/solo se cambia desde su boton/i);
  });

  it("no autorizar exige el motivo", async () => {
    await entrarComo(ANFITRIONA);
    await expect(
      resolverRevisionManual({ invitadoUuid: invitado.sinConsulta, aprobar: false }),
    ).rejects.toThrow(/escribe por que/i);
  });

  it("aprobar queda anotado con quién", async () => {
    await entrarComo(ANFITRIONA);
    await resolverRevisionManual({ invitadoUuid: invitado.incapaz, aprobar: true });
    const { data } = await servicio
      .from("invitado")
      .select("revision_anfitrion, revision_anfitrion_por, revision_anfitrion_en")
      .eq("id", invitado.incapaz)
      .single();
    expect(data!.revision_anfitrion).toBe("aprobada");
    expect(data!.revision_anfitrion_por).toBe(sofiaId);
    expect(data!.revision_anfitrion_en).toBeTruthy();
    expect((await estadoEnLaPantalla("incapaz"))?.verificacion).toBe("aprobada_manual");
  });
});

describe("no autorizar cierra la puerta", () => {
  it("la portería no puede marcar la entrada de quien no se autorizó", async () => {
    await entrarComo(ANFITRIONA);
    await resolverRevisionManual({
      invitadoUuid: invitado.hallazgo,
      aprobar: false,
      nota: "Antecedentes graves",
    });
    expect((await estadoEnLaPantalla("hallazgo"))?.verificacion).toBe("rechazada");

    // Directo a la fila: la regla vive en la base, no en el botón del guardia.
    const { error } = await servicio
      .from("invitado")
      .update({ llego: true })
      .eq("id", invitado.hallazgo);
    expect(error?.message ?? "").toMatch(/no autorizo la entrada/i);
  });

  it("y quien sí se autorizó, entra", async () => {
    // El control: si el disparador cerrara a todos, el caso de arriba pasaria igual.
    const { error } = await servicio
      .from("invitado")
      .update({ llego: true })
      .eq("id", invitado.incapaz);
    expect(error).toBeNull();
  });
});

describe("el informe", () => {
  it("lo abre el anfitrión, con enlace firmado", async () => {
    await entrarComo(ANFITRIONA);
    const enlace = await abrirInformeAntecedentes(invitado.hallazgo);
    expect(enlace).toMatch(/\/storage\/v1\/object\/sign\/antecedentes\//);

    const pdf = await fetch(enlace);
    expect(pdf.status).toBe(200);
    const inicio = new TextDecoder().decode((await pdf.arrayBuffer()).slice(0, 5));
    expect(inicio).toBe("%PDF-");
  }, 60_000);

  it("no lo abre quien no es el anfitrión", async () => {
    await entrarComo(AJENO);
    await expect(abrirInformeAntecedentes(invitado.hallazgo)).rejects.toThrow(
      /solo el anfitrión/i,
    );
  });

  it("de una simulada no se inventa uno", async () => {
    await entrarComo(ANFITRIONA);
    expect((await estadoEnLaPantalla("simulada"))?.tieneInforme).toBe(false);
    await expect(abrirInformeAntecedentes(invitado.simulada)).rejects.toThrow(/simulada/i);
  });
});
