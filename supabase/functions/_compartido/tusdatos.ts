/**
 * El cliente de tusdatos.co, el proveedor de verificación de antecedentes.
 *
 * Vive aparte de la función que lo usa para poder leerlo —y probarlo— sin
 * montar medio Supabase alrededor. Aquí no hay ninguna decisión de producto:
 * solo cómo se habla con ellos.
 *
 * ----------------------------------------------------------------------------
 * Cómo funciona su API, en corto
 * ----------------------------------------------------------------------------
 * Tres pasos, y el segundo es el que sorprende:
 *
 *   1. **Token.** `POST /api/v1/auth/token` autenticando con usuario y
 *      contraseña (Basic). Devuelve un `access_token` que **solo se ve esa
 *      vez**, y cada cuenta admite diez tokens activos a la vez.
 *   2. **Lanzar.** `POST /api/launch` con el documento y su tipo. Devuelve un
 *      identificador de tarea y **no el resultado**: la consulta tarda
 *      alrededor de un minuto.
 *   3. **Preguntar.** `GET /api/results/{jobkey}` hasta que el estado sea
 *      `finalizado`. Responde `207` mientras procesa y `200` al terminar. El
 *      identificador **caduca a las dos horas**; pasado eso devuelve `404` y
 *      hay que dejar de preguntar.
 *
 * Ellos piden cinco segundos entre peticiones, y eso se respeta.
 *
 * ----------------------------------------------------------------------------
 * Cada llamada cuesta dinero
 * ----------------------------------------------------------------------------
 * «Cada petición realizada a este endpoint en producción consume créditos sobre
 * el plan adquirido», dice su documentación. No es una API que se pueda probar
 * a la ligera: una suite de pruebas que la llamara gastaría el saldo del
 * cliente. Por eso el interruptor de la función que la usa nace apagado, igual
 * que el de la TRA.
 */

const BASE = "https://api.tusdatos.co";

/** Los que su API acepta. `PEP` **no**: perdió validez en marzo de 2023. */
export type TipoDocumento = "CC" | "CE" | "INT" | "NIT" | "PP" | "PPT" | "NOMBRE";

/**
 * Traduce nuestro tipo de documento al suyo.
 *
 * Devuelve `null` cuando no hay equivalencia, y entonces **no se consulta**:
 * mandar un tipo que no entienden gastaría un crédito para recibir un error.
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

export interface Credenciales {
  usuario: string;
  clave: string;
}

/** El `access_token` de Bearer, a partir de usuario y contraseña. */
export async function pedirToken(c: Credenciales): Promise<string> {
  const basic = btoa(`${c.usuario}:${c.clave}`);
  const r = await fetch(`${BASE}/api/v1/auth/token`, {
    method: "POST",
    headers: { Authorization: `Basic ${basic}` },
  });
  if (!r.ok) {
    throw new Error(
      `tusdatos no dio token (${r.status}). ` +
        (r.status === 400
          ? "Puede que la cuenta ya tenga diez tokens activos: hay que revocar o rotar."
          : "Revisa usuario y contraseña."),
    );
  }
  const cuerpo = await r.json();
  const token = cuerpo?.access_token;
  if (!token) throw new Error("tusdatos respondió sin access_token");
  return token;
}

export interface Consulta {
  token: string;
  doc: string;
  typedoc: TipoDocumento;
  /** Solo para pasaporte y documento internacional, donde el número no basta. */
  nombre?: string;
}

/** Lanza la consulta y devuelve el identificador de la tarea. */
export async function lanzarConsulta(c: Consulta): Promise<string> {
  const cuerpo: Record<string, unknown> = {
    doc: c.doc.replace(/[^0-9A-Za-z]/g, ""),
    typedoc: c.typedoc,
  };
  // Lo piden para `PP` e `INT`; mandarlo siempre no estorba y evita un error
  // por omisión que costaría un crédito.
  if (c.nombre) cuerpo.name = c.nombre;

  const r = await fetch(`${BASE}/api/launch`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${c.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(cuerpo),
  });

  const datos = await r.json().catch(() => null);
  if (!r.ok) {
    throw new Error(
      `tusdatos rechazó la consulta (${r.status}): ${JSON.stringify(datos)}`,
    );
  }
  const jobid = datos?.jobid ?? datos?.jobkey ?? datos?.id;
  if (!jobid) throw new Error("tusdatos no devolvió el identificador de la tarea");
  return String(jobid);
}

export interface Resultado {
  estado: "finalizado" | "procesando" | "error";
  /** Lo que devuelven tal cual, para guardarlo entero. */
  datos: unknown;
  /** Si encontraron algo. `null` cuando todavía no se sabe. */
  hallazgos: boolean | null;
}

/**
 * Pregunta una vez por el resultado.
 *
 * Una vez, no en bucle: quien decide cuántas veces y cada cuánto es quien
 * llama, porque eso depende de si hay alguien esperando delante de una pantalla
 * o si lo va a avisar un webhook.
 */
export async function consultarResultado(
  token: string,
  jobid: string,
): Promise<Resultado> {
  const r = await fetch(`${BASE}/api/results/${jobid}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  // La tarea caducó --dos horas-- o nunca existió. Hay que dejar de preguntar.
  if (r.status === 404) {
    return { estado: "error", datos: { motivo: "la tarea caducó o no existe" }, hallazgos: null };
  }

  const datos = await r.json().catch(() => null);

  if (r.status === 207) return { estado: "procesando", datos, hallazgos: null };
  if (!r.ok) return { estado: "error", datos, hallazgos: null };

  /*
    `hallazgos` es lo único que de verdad decide si la persona pasa o no, y por
    eso se lee con cuidado: su respuesta trae listas por fuente, y lo que
    importa es si alguna trajo algo. Un `false` y un «no se sabe» no son lo
    mismo, así que el segundo es `null` y nunca se traduce a «aprobada».
  */
  const d = datos as Record<string, unknown> | null;
  const crudo = d?.hallazgos ?? d?.findings;
  const hallazgos =
    typeof crudo === "boolean"
      ? crudo
      : Array.isArray(crudo)
        ? crudo.length > 0
        : null;

  return { estado: "finalizado", datos, hallazgos };
}
