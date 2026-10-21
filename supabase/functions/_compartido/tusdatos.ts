/**
 * El cliente de tusdatos.co, el proveedor de verificación de antecedentes.
 *
 * Vive aparte de la función que lo usa para poder leerlo —y probarlo— sin
 * montar medio Supabase alrededor. Aquí no hay ninguna decisión de producto
 * salvo una, `veredicto`, que está al final y lo dice.
 *
 * ----------------------------------------------------------------------------
 * Cómo funciona su API, en corto
 * ----------------------------------------------------------------------------
 * Dos pasos, y el primero es el que sorprende:
 *
 *   1. **Lanzar.** `POST /api/launch` con el documento y su tipo. Devuelve un
 *      identificador de tarea y **no el resultado**: la consulta tarda
 *      alrededor de un minuto.
 *   2. **Preguntar.** `GET /api/results/{jobid}` hasta que el estado sea
 *      `finalizado`. Responde `207` mientras procesa y `200` al terminar. El
 *      identificador **caduca a las dos horas**; pasado eso devuelve `404` y
 *      hay que dejar de preguntar.
 *
 * Ellos piden cinco segundos entre peticiones, y eso se respeta.
 *
 * ----------------------------------------------------------------------------
 * Por qué usuario y contraseña en cada petición, y no un token
 * ----------------------------------------------------------------------------
 * La primera versión pedía un token nuevo por consulta. Sus tokens **no
 * caducan** y cada cuenta admite **diez**: a la undécima consulta la cuenta se
 * habría quedado sin poder entrar. Y en su ambiente de pruebas el token que
 * devuelven ni siquiera sirve --responde 401--, así que tampoco se podía
 * probar.
 *
 * Su documentación da el usuario y la contraseña por suficientes «para la
 * mayoría de integraciones», y es lo único que funciona igual en los dos
 * ambientes.
 *
 * ----------------------------------------------------------------------------
 * Cada llamada cuesta dinero
 * ----------------------------------------------------------------------------
 * «Cada petición realizada a este endpoint en producción consume créditos sobre
 * el plan adquirido», dice su documentación. Solo cuesta **lanzar**: preguntar
 * por el resultado no. Por eso el interruptor de la función que la usa nace
 * apagado, igual que el de la TRA.
 *
 * Todo lo de aquí se comprobó el 13/10/2026 contra su ambiente de pruebas, con
 * los documentos de ejemplo que publican: 111 trae hallazgos, 112 sale limpio,
 * 113 falla en todas las fuentes y 128 es de alguien que prohibió la consulta.
 */

/** Respuestas fijas y sin costo. Usuario `pruebas`, contraseña `password`. */
export const URL_DE_PRUEBAS = "https://docs.tusdatos.co";

/**
 * La que da su documentación para producción. **Sin estrenar**: hasta tener
 * cuenta con plan no se ha podido llamar ni una vez.
 */
export const URL_DE_PRODUCCION = "https://dash-board.tusdatos.co";

export function esAmbienteDePruebas(base: string): boolean {
  return base.replace(/\/+$/, "").endsWith("docs.tusdatos.co");
}

export interface Conexion {
  base: string;
  usuario: string;
  clave: string;
}

function cabeceras(c: Conexion): Record<string, string> {
  return { Authorization: `Basic ${btoa(`${c.usuario}:${c.clave}`)}` };
}

/** Los que su API acepta. `PEP` **no**: perdió validez en marzo de 2023. */
export type TipoDocumento = "CC" | "CE" | "INT" | "NIT" | "PP" | "PPT" | "NOMBRE";

/**
 * Traduce nuestro tipo de documento al suyo.
 *
 * Devuelve `null` cuando no hay equivalencia, y entonces **no se consulta**:
 * mandar un tipo que no entienden es un 400 seguro.
 */
export function tipoDocumentoDeTusdatos(nuestro: string | null): TipoDocumento | null {
  const t = (nuestro ?? "").toLowerCase().replace(/[\s_-]/g, "");
  if (t.includes("cedulaciudadania") || t === "cc") return "CC";
  if (t.includes("cedulaextranjeria") || t === "ce") return "CE";
  if (t.includes("pasaporte") || t === "pp") return "PP";
  if (t.includes("permisoproteccion") || t === "ppt") return "PPT";
  if (t.includes("nit")) return "NIT";
  /*
    El PEP venezolano se mapeaba aquí en la primera versión y **se quitó**: su
    propia documentación dice que dejó de ser válido para consultas de identidad
    en marzo de 2023, por el artículo 38 de la Resolución 0971 de 2021. Lo que
    hay que pedirle a esa persona es su PPT.
  */
  return null;
}

/**
 * Para estos dos la fecha de expedición es obligatoria: sin ella responden
 * 400 «Debe proporcionar la fecha de expedición».
 */
export function pideFechaDeExpedicion(tipo: TipoDocumento): boolean {
  return tipo === "CE" || tipo === "PPT";
}

/** `dd/mm/yyyy`, que es como la piden. Acepta también `yyyy-mm-dd`. */
export function fechaParaTusdatos(fecha: string | null | undefined): string | null {
  const f = (fecha ?? "").trim();
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(f);
  if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`;
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(f)) return f;
  return null;
}

/**
 * Por qué no salió la consulta.
 *
 * `titular` es el único que no es un fallo: la persona dio instrucción de que
 * no se consulten sus datos, y ellos responden 403 a cualquiera que pregunte.
 */
export class ConsultaRechazada extends Error {
  constructor(
    readonly motivo: "titular" | "credenciales" | "peticion" | "proveedor",
    mensaje: string,
  ) {
    super(mensaje);
    this.name = "ConsultaRechazada";
  }
}

export interface Consulta {
  doc: string;
  typedoc: TipoDocumento;
  /** Solo para pasaporte y documento internacional, donde el número no basta. */
  nombre?: string;
  /** `dd/mm/yyyy`. Obligatoria para CE y PPT. */
  fechaExpedicion?: string;
  /** Vuelve en su aviso automático, para saber de quién es sin buscar. */
  referencia?: string;
}

export interface Lanzada {
  jobid: string;
  /**
   * Si pudieron comprobar que el documento existe. `null` cuando no lo dicen,
   * que es siempre con pasaporte y con búsqueda por nombre.
   */
  validado: boolean | null;
}

/** Lanza la consulta y devuelve el identificador de la tarea. */
export async function lanzarConsulta(c: Conexion, q: Consulta): Promise<Lanzada> {
  const cuerpo: Record<string, unknown> = {
    doc: q.doc.replace(/[^0-9A-Za-z]/g, ""),
    typedoc: q.typedoc,
  };
  // Lo piden para `PP` e `INT`; mandarlo siempre no estorba.
  if (q.nombre) cuerpo.name = q.nombre;
  if (q.fechaExpedicion) cuerpo.fechaE = q.fechaExpedicion;
  if (q.referencia) cuerpo.webhook_reference = q.referencia.slice(0, 250);

  const r = await fetch(`${c.base}/api/launch`, {
    method: "POST",
    headers: { ...cabeceras(c), "Content-Type": "application/json" },
    body: JSON.stringify(cuerpo),
  });
  const datos = await r.json().catch(() => null);

  if (!r.ok) {
    const dicho = datos?.error ?? datos?.detail;
    const texto = typeof dicho === "string" ? dicho : JSON.stringify(datos);
    if (r.status === 403) {
      throw new ConsultaRechazada(
        "titular",
        "Esa persona dio instrucción de que no se consulten sus datos",
      );
    }
    if (r.status === 401) {
      throw new ConsultaRechazada("credenciales", "tusdatos no aceptó el usuario o la contraseña");
    }
    if (r.status === 400 || r.status === 422) {
      throw new ConsultaRechazada("peticion", `tusdatos no aceptó la consulta: ${texto}`);
    }
    throw new ConsultaRechazada("proveedor", `tusdatos falló al lanzar (${r.status}): ${texto}`);
  }

  if (!datos?.jobid) {
    throw new ConsultaRechazada("proveedor", "tusdatos no devolvió el identificador de la tarea");
  }
  return {
    jobid: String(datos.jobid),
    validado: typeof datos.validado === "boolean" ? datos.validado : null,
  };
}

export type Nivel = "alto" | "medio" | "bajo" | "info" | "ninguno";

export interface Resultado {
  /**
   * `caducada` es su 404: pasaron las dos horas o la tarea no existe, y hay
   * que dejar de preguntar. `fallida` es su 500.
   */
  estado: "procesando" | "finalizado" | "caducada" | "fallida";
  /**
   * El hallazgo de mayor categoría. `null` cuando todavía no se sabe **o
   * cuando no se entiende lo que mandaron**, que no es lo mismo que `ninguno`.
   */
  nivel: Nivel | null;
  /** Con el que se pide el reporte completo. No caduca como el `jobid`. */
  reporteId: string | null;
  /** Las fuentes que no respondieron, por su código: `policia`, `inpec`… */
  fuentesConError: string[];
  validado: boolean | null;
  /** Lo que devuelven tal cual, para guardarlo entero. */
  datos: unknown;
}

function nivelDe(crudo: unknown): Nivel | null {
  if (typeof crudo !== "string") return null;
  // Llega «Alto» en unas respuestas y «alto» en otras.
  const t = crudo.trim().toLowerCase();
  if (t === "") return "ninguno";
  if (t === "alto" || t === "medio" || t === "bajo") return t;
  if (t === "info" || t === "informativo") return "info";
  return null;
}

/**
 * Lee su respuesta. Separada de la llamada para poder probarla con las
 * respuestas de verdad, guardadas, sin red.
 */
export function leerResultado(status: number, datos: unknown): Resultado {
  const d = (datos ?? {}) as Record<string, unknown>;
  const vacio = { nivel: null, reporteId: null, fuentesConError: [], validado: null, datos };

  if (status === 404) return { ...vacio, estado: "caducada" };
  if (status === 207) return { ...vacio, estado: "procesando" };
  if (status !== 200 || d.estado !== "finalizado") return { ...vacio, estado: "fallida" };

  return {
    estado: "finalizado",
    /*
      Se lee `hallazgos` --el nivel-- y no `hallazgo` --el sí o no--: en su
      ejemplo de cédula de extranjería vienen `hallazgo: false` y
      `hallazgos: "bajo"` a la vez, así que el booleano no cuenta lo mismo.
    */
    nivel: nivelDe(d.hallazgos),
    reporteId: typeof d.id === "string" ? d.id : null,
    fuentesConError: Array.isArray(d.errores) ? d.errores.map(String) : [],
    validado: typeof d.validado === "boolean" ? d.validado : null,
    datos,
  };
}

/**
 * Pregunta una vez por el resultado.
 *
 * Una vez, no en bucle: quien decide cuántas veces y cada cuánto es quien
 * llama, porque eso depende de si hay alguien esperando delante de una pantalla
 * o si lo va a avisar un webhook.
 */
export async function consultarResultado(c: Conexion, jobid: string): Promise<Resultado> {
  const r = await fetch(`${c.base}/api/results/${jobid}`, { headers: cabeceras(c) });
  if (r.status === 401) {
    throw new ConsultaRechazada("credenciales", "tusdatos no aceptó el usuario o la contraseña");
  }
  return leerResultado(r.status, await r.json().catch(() => null));
}

/**
 * El informe oficial en PDF, si ya está listo.
 *
 * Su API responde 200 con el PDF, o 202 mientras lo construye (ellos dicen
 * reintentar a los 10 s). Su ambiente de pruebas **no genera PDF**: para
 * cualquier reporte responde «reporte no encontrado». Por eso devuelve `null`
 * en vez de lanzar, y quien llama arma el suyo con `reporteEnJson`.
 *
 * Cuántas veces y cada cuánto lo decide quien llama, con los parámetros
 * `antecedentes_informe_intentos` y `antecedentes_informe_espera_segundos`
 * (hasta el 18/10/2026, 3 y 10 s escritos aquí).
 */
export async function reporteEnPdf(
  c: Conexion,
  reporteId: string,
  espera: { intentos: number; esperaSegundos: number },
): Promise<Uint8Array | null> {
  for (let intento = 0; intento < espera.intentos; intento += 1) {
    const r = await fetch(`${c.base}/api/v2/report_pdf/${reporteId}`, { headers: cabeceras(c) });
    const tipo = r.headers.get("content-type") ?? "";
    if (r.status === 200 && tipo.includes("application/pdf")) {
      return new Uint8Array(await r.arrayBuffer());
    }
    await r.body?.cancel();
    if (r.status !== 202) return null;
    await new Promise((listo) => setTimeout(listo, espera.esperaSegundos * 1000));
  }
  return null;
}

/** El informe completo en datos: una lista por fuente con lo que encontró. */
export async function reporteEnJson(
  c: Conexion,
  reporteId: string,
): Promise<Record<string, unknown> | null> {
  const r = await fetch(`${c.base}/api/report_json/${reporteId}`, { headers: cabeceras(c) });
  if (!r.ok) {
    await r.body?.cancel();
    return null;
  }
  const d = await r.json().catch(() => null);
  return d && typeof d === "object" && !Array.isArray(d) ? (d as Record<string, unknown>) : null;
}

/**
 * Las fuentes sin las que no se puede decir que alguien «salió limpio».
 *
 * **Es una propuesta, no una decisión cerrada**: depende de qué fuentes traiga
 * el plan que se contrate, y eso está preguntado a tusdatos. Son las de
 * antecedentes penales y las listas internacionales; quedan fuera tránsito,
 * contratación pública, salud y estudios.
 */
export const FUENTES_OBLIGATORIAS = [
  "policia",
  "procuraduria",
  "inpec",
  "delitos_sexuales",
  "interpol",
  "ofac",
  "lista_onu",
] as const;

export interface Veredicto {
  resultado: "pendiente" | "aprobada" | "rechazada" | "error_proveedor";
  motivo: string;
}

/**
 * Qué se anota de una consulta. **La única decisión de producto del archivo.**
 *
 * El caso que la justifica: con las cuarenta y tantas fuentes caídas, su
 * respuesta dice `finalizado` y **sin hallazgos**. Quien lea solo eso aprueba a
 * una persona a la que no se miró en ningún sitio. Por eso lo que no se pudo
 * comprobar nunca se traduce a `aprobada`.
 *
 * Desde qué nivel de hallazgo se marca a alguien ya no está escrito aquí: es
 * el parámetro `antecedentes_nivel_que_pide_revision`, de ámbito edificio
 * --un edificio puede querer ser más estricto--, y lo pasa quien llama. Hoy
 * vale «alto», que era la propuesta del 13/10/2026: un hallazgo «informativo»
 * es estar inscrito en el RUT o tener la salud al día, y marcar por cualquier
 * hallazgo marcaría a casi todo el mundo.
 */
export function veredicto(r: Resultado, nivelQuePideRevision: string): Veredicto {
  if (!esNivelDeRevision(nivelQuePideRevision)) {
    // Sin respaldo: un umbral que no se entiende no se cambia por otro a ojo.
    throw new Error(
      `antecedentes_nivel_que_pide_revision no es un nivel válido: "${nivelQuePideRevision}" ` +
        `(tiene que ser ${Object.keys(RANGO_DE_NIVEL).join(", ")})`,
    );
  }
  const umbral = RANGO_DE_NIVEL[nivelQuePideRevision as NivelConHallazgo];

  if (r.estado === "procesando") {
    return { resultado: "pendiente", motivo: "La consulta sigue en curso" };
  }
  if (r.estado === "caducada") {
    return {
      resultado: "error_proveedor",
      // Su 404 dice «tarea no válida»: o pasaron las dos horas o no la reconoce
      // (su ambiente de pruebas solo conoce sus cédulas de ejemplo).
      motivo: "tusdatos ya no tiene esta consulta: caducó o no la reconoce",
    };
  }
  if (r.estado === "fallida") {
    return { resultado: "error_proveedor", motivo: "La consulta falló del lado de tusdatos" };
  }

  // Un hallazgo que llega al umbral lo es aunque otra fuente no haya respondido.
  if (r.nivel !== null && r.nivel !== "ninguno" && RANGO_DE_NIVEL[r.nivel] >= umbral) {
    return {
      resultado: "rechazada",
      motivo: r.nivel === nivelQuePideRevision
        ? `Tiene al menos un hallazgo de nivel ${r.nivel}`
        : `Tiene al menos un hallazgo de nivel ${r.nivel} (se revisa desde ${nivelQuePideRevision})`,
    };
  }
  if (r.nivel === null) {
    return {
      resultado: "error_proveedor",
      motivo: "La consulta terminó y no se entiende el nivel de hallazgo que devolvió",
    };
  }
  if (r.validado === false) {
    return {
      resultado: "error_proveedor",
      motivo: "No se pudo comprobar que ese documento exista",
    };
  }
  const caidas = FUENTES_OBLIGATORIAS.filter((f) => r.fuentesConError.includes(f));
  if (caidas.length > 0) {
    return {
      resultado: "error_proveedor",
      motivo: `Verificación incompleta: no respondieron ${caidas.join(", ")}`,
    };
  }
  return {
    resultado: "aprobada",
    motivo:
      r.nivel === "ninguno"
        ? "Sin hallazgos"
        : `Sin hallazgos de nivel ${nivelQuePideRevision} o mayor (el mayor es ${r.nivel})`,
  };
}

type NivelConHallazgo = Exclude<Nivel, "ninguno">;

/**
 * Si un texto sirve como umbral de revisión. Para comprobarlo **antes** de
 * lanzar una consulta, que es lo que cuesta dinero.
 */
export function esNivelDeRevision(nivel: string): boolean {
  return Object.prototype.hasOwnProperty.call(RANGO_DE_NIVEL, nivel);
}

/** El orden de los niveles, de menos a más grave, para compararlos con el umbral. */
const RANGO_DE_NIVEL: Record<NivelConHallazgo, number> = {
  info: 1,
  bajo: 2,
  medio: 3,
  alto: 4,
};
