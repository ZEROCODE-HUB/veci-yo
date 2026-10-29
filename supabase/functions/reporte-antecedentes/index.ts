/**
 * reporte-antecedentes · el informe de antecedentes para el anfitrión
 *
 * Lo pidió la responsable de producto el 14/10/2026: cuando la verificación
 * requiere aprobación manual, el anfitrión tiene que ver el informe. Lo usa
 * para justificarse ante Airbnb, y por eso lleva **marca de agua**: «no
 * compartir con el huésped».
 *
 * - Solo lo pide el anfitrión del huésped (`es_anfitrion_del_invitado`, con la
 *   sesión de quien llama). La portería y el huésped no lo ven nunca (KT).
 * - La primera vez se arma y se guarda en el bucket privado `antecedentes`,
 *   que no tiene ninguna política: solo lo abre esta función. Después se
 *   reutiliza; se devuelve un enlace firmado de cinco minutos.
 * - El PDF es el **oficial** de Tus Datos cuando lo hay. Su ambiente de pruebas
 *   no genera PDF, así que entonces se arma uno con los datos del informe.
 * - Una verificación `simulado` no tiene informe: no se inventa uno.
 */
import { createClient } from "jsr:@supabase/supabase-js@2";
import {
  degrees,
  PDFDocument,
  type PDFFont,
  type PDFPage,
  rgb,
  StandardFonts,
} from "npm:pdf-lib@1.17.1";
import {
  type Conexion,
  reporteEnJson,
  reporteEnPdf,
} from "../_compartido/tusdatos.ts";
import { CORS, responderPreflight } from "../_compartido/cors.ts";
import { parametroEntero } from "../_compartido/parametros.ts";
import { ajustesDeTusdatos } from "../_compartido/ajustesDeTusdatos.ts";

const json = (cuerpo: unknown, status: number) =>
  new Response(JSON.stringify(cuerpo), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });

const MARCA = "CONFIDENCIAL — NO COMPARTIR CON EL HUÉSPED";
const BUCKET = "antecedentes";

/** Helvetica solo sabe WinAnsi: lo que no esté ahí se cambia por «?». */
function seguro(texto: string): string {
  return texto.replace(/[^\x20-\x7E -ÿ—–“”‘’…•]/g, "?");
}

function estamparMarca(pagina: PDFPage, fuente: PDFFont, pie: string) {
  const { width, height } = pagina.getSize();
  const tam = Math.min(width, height) / 18;
  const ancho = fuente.widthOfTextAtSize(MARCA, tam);
  for (const y of [height * 0.25, height * 0.55, height * 0.85]) {
    pagina.drawText(MARCA, {
      x: (width - ancho * Math.cos(Math.PI / 6)) / 2,
      y: y - (ancho * Math.sin(Math.PI / 6)) / 2,
      size: tam,
      font: fuente,
      color: rgb(0.85, 0.1, 0.1),
      opacity: 0.22,
      rotate: degrees(30),
    });
  }
  pagina.drawText(seguro(pie), {
    x: 24,
    y: 14,
    size: 7,
    font: fuente,
    color: rgb(0.6, 0.1, 0.1),
  });
}

interface Datos {
  nombre: string;
  documento: string;
  tipoDocumento: string | null;
  fechaExpedicion: string | null;
  nacionalidad: string | null;
  fechaNacimiento: string | null;
  nivel: string | null;
  motivo: string | null;
  fuentesConError: string[];
  validado: boolean | null;
  reporteId: string | null;
  consultadaEn: string | null;
  pruebas: boolean;
  estancia: { alojamiento: string; desde: string | null; hasta: string | null; anfitrion: string | null };
  autorizacion: { documento: string | null; aceptadaEn: string | null };
  decision: { estado: string | null; nota: string | null; por: string | null; en: string | null };
  informe: Record<string, unknown> | null;
}

/** Nombres legibles de las fuentes más comunes; las demás, tal cual. */
const FUENTES: Record<string, string> = {
  policia: "Policía Nacional (antecedentes judiciales)",
  procuraduria: "Procuraduría (antecedentes disciplinarios)",
  contraloria: "Contraloría (responsabilidad fiscal)",
  contaduria: "Contaduría (boletín de deudores morosos)",
  inpec: "INPEC (población privada de la libertad)",
  delitos_sexuales: "Inhabilidades por delitos sexuales contra menores",
  ofac: "Lista OFAC (Estados Unidos)",
  lista_onu: "Lista del Consejo de Seguridad de la ONU",
  interpol: "Interpol",
  europol: "Europol",
  rnmc: "Registro Nacional de Medidas Correctivas (Código de Policía)",
  rama_unificada: "Rama Judicial (procesos)",
  juzgados_tyba: "Rama Judicial (TYBA)",
  sirna: "Registro Nacional de Abogados (sanciones)",
  peps: "Personas expuestas políticamente y listas restrictivas",
  registraduria_certificado: "Registraduría (vigencia del documento)",
  defunciones_registraduria: "Registraduría (defunciones)",
  simit: "SIMIT (multas de tránsito)",
  offshoreleaks: "Offshore Leaks / Panama Papers",
};

/** Lo que no es una fuente sino datos del propio reporte. */
const NO_SON_FUENTES = new Set([
  "dict_hallazgos",
  "dest",
  "id",
  "fecha",
  "nombre",
  "error",
  "errores",
  "genero",
  "monitoring_date",
  "hallazgos",
  "nombre-procuraduria",
  "nombre_policia",
]);

function nombreDeFuente(clave: string): string {
  return FUENTES[clave] ?? clave.replace(/[_-]/g, " ").replace(/^\w/, (c) => c.toUpperCase());
}

/** Un valor del reporte en líneas «ruta: valor», sin los vacíos. */
function aplanar(valor: unknown, ruta = "", salida: string[] = []): string[] {
  if (salida.length >= 80) return salida;
  if (valor === null || valor === undefined) return salida;
  if (typeof valor === "boolean") {
    salida.push(`${ruta || "Resultado"}: ${valor ? "sí aparece" : "no aparece"}`);
  } else if (typeof valor === "string" || typeof valor === "number") {
    const t = String(valor).trim();
    if (t) salida.push(`${ruta || "Dato"}: ${t.length > 400 ? `${t.slice(0, 400)}…` : t}`);
  } else if (Array.isArray(valor)) {
    valor.forEach((v, i) =>
      aplanar(v, valor.length > 1 ? `${ruta}${ruta ? " " : ""}#${i + 1}` : ruta, salida)
    );
  } else if (typeof valor === "object") {
    for (const [k, v] of Object.entries(valor as Record<string, unknown>)) {
      const nombre = k.replace(/[_:]+/g, " ").trim();
      aplanar(v, ruta ? `${ruta} › ${nombre}` : nombre, salida);
    }
  }
  return salida;
}

function tieneAlgo(valor: unknown): boolean {
  if (valor === null || valor === undefined || valor === false) return false;
  if (typeof valor === "string") return valor.trim() !== "";
  if (Array.isArray(valor)) return valor.some(tieneAlgo);
  if (typeof valor === "object") return Object.values(valor as object).some(tieneAlgo);
  return true;
}

const fecha = (iso: string | null) => (iso ? iso.replace("T", " ").slice(0, 16) : "sin dato");

/**
 * El informe que se arma cuando Tus Datos no da su PDF (su ambiente de
 * pruebas).
 *
 * El cliente pidió el 16/10/2026 que traiga **todos los datos posibles**: lo va
 * a revisar el abogado. Lleva la consulta, la persona, la estancia, la
 * autorización que aceptó, el resumen de hallazgos por nivel, el detalle de
 * **cada** fuente (antes solo salían las que eran listas, y se perdían INPEC,
 * OFAC, Europol…) y la decisión del anfitrión.
 */
async function armarInforme(d: Datos): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const normal = await pdf.embedFont(StandardFonts.Helvetica);
  const negrita = await pdf.embedFont(StandardFonts.HelveticaBold);
  let pagina = pdf.addPage([595, 842]);
  let y = 800;

  const linea = (
    texto: string,
    opciones: {
      negrita?: boolean;
      tam?: number;
      color?: [number, number, number];
      sangria?: number;
    } = {},
  ) => {
    const tam = opciones.tam ?? 10;
    const fuente = opciones.negrita ? negrita : normal;
    const x = 36 + (opciones.sangria ?? 0);
    const ancho = 523 - (opciones.sangria ?? 0);
    // Partir a mano: pdf-lib no hace saltos de línea solo.
    const palabras = seguro(texto).split(/\s+/);
    let actual = "";
    const filas: string[] = [];
    for (const p of palabras) {
      const prueba = actual ? `${actual} ${p}` : p;
      if (fuente.widthOfTextAtSize(prueba, tam) > ancho && actual) {
        filas.push(actual);
        actual = p;
      } else {
        actual = prueba;
      }
    }
    if (actual) filas.push(actual);
    for (const f of filas) {
      if (y < 60) {
        pagina = pdf.addPage([595, 842]);
        y = 800;
      }
      const [r, g, b] = opciones.color ?? [0, 0, 0];
      pagina.drawText(f, { x, y, size: tam, font: fuente, color: rgb(r, g, b) });
      y -= tam + 4;
    }
  };
  const titulo = (texto: string) => {
    y -= 10;
    linea(texto, { negrita: true, tam: 12, color: [0.1, 0.2, 0.45] });
    y -= 2;
  };
  const dato = (etiqueta: string, valor: string | null | undefined) =>
    linea(`${etiqueta}: ${valor && valor.trim() ? valor : "sin dato"}`, { sangria: 8 });

  const r = d.informe ?? {};
  const texto = (k: string) => (typeof r[k] === "string" ? (r[k] as string) : null);

  linea("Informe de antecedentes", { negrita: true, tam: 18 });
  linea("Veciyo · uso exclusivo del anfitrión del alojamiento", {
    tam: 9,
    color: [0.4, 0.4, 0.4],
  });
  if (d.pruebas) {
    y -= 6;
    linea(
      "AMBIENTE DE PRUEBAS DEL PROVEEDOR: los hallazgos de este informe son datos ficticios que el proveedor entrega para probar la integración. No corresponden a la persona consultada.",
      { negrita: true, tam: 9, color: [0.75, 0.1, 0.1] },
    );
  }

  titulo("1. La consulta");
  dato("Proveedor", "Tus Datos (tusdatos.co)");
  dato("Ambiente", d.pruebas ? "Pruebas" : "Producción");
  dato("Fecha de la consulta", fecha(d.consultadaEn));
  dato("Fecha del reporte según el proveedor", texto("fecha"));
  dato("Identificador del reporte", d.reporteId);
  dato(
    "Documento validado por el proveedor",
    d.validado === null ? "el proveedor no lo indica" : d.validado ? "sí" : "no",
  );

  titulo("2. La persona consultada");
  dato("Nombre registrado en el preregistro", d.nombre);
  dato("Tipo de documento", d.tipoDocumento);
  dato("Número de documento", d.documento);
  dato("Fecha de expedición", d.fechaExpedicion);
  dato("Fecha de nacimiento", d.fechaNacimiento);
  dato("Nacionalidad", d.nacionalidad);
  if (d.informe) {
    dato("Nombre según el proveedor", texto("nombre"));
    dato("Género según el proveedor", texto("genero"));
  }

  titulo("3. La estancia");
  dato("Alojamiento", d.estancia.alojamiento);
  dato("Llegada", d.estancia.desde);
  dato("Salida", d.estancia.hasta);
  dato("Anfitrión", d.estancia.anfitrion);

  titulo("4. Autorización del huésped");
  dato("Documento aceptado", d.autorizacion.documento);
  dato("Aceptado el", fecha(d.autorizacion.aceptadaEn));

  titulo("5. Resultado");
  dato("Nivel de hallazgos", d.nivel);
  dato("Conclusión", d.motivo);
  dato(
    "Fuentes que no respondieron",
    d.fuentesConError.length > 0 ? d.fuentesConError.map(nombreDeFuente).join(", ") : "ninguna",
  );

  const porNivel = (r.dict_hallazgos ?? {}) as Record<string, unknown>;
  const NIVELES: [string, string][] = [
    ["altos", "Altos"],
    ["medios", "Medios"],
    ["bajos", "Bajos"],
    ["infos", "Informativos"],
  ];
  const lista = (k: string) =>
    Array.isArray(porNivel[k]) ? (porNivel[k] as Record<string, unknown>[]) : [];
  if (d.informe) {
    dato("Hallazgos por nivel", NIVELES.map(([k, n]) => `${n}: ${lista(k).length}`).join(" · "));
  }

  titulo("6. Hallazgos");
  let alguno = false;
  for (const [k, n] of NIVELES) {
    const hallazgos = lista(k);
    if (hallazgos.length === 0) continue;
    alguno = true;
    y -= 4;
    linea(`Nivel ${n.toLowerCase()} (${hallazgos.length})`, {
      negrita: true,
      color: k === "altos" ? [0.75, 0.1, 0.1] : [0.2, 0.2, 0.2],
    });
    for (const h of hallazgos) {
      linea(`• ${String(h.hallazgo ?? h.codigo ?? "Hallazgo")}`, {
        negrita: true,
        tam: 9,
        sangria: 8,
      });
      if (h.descripcion) linea(String(h.descripcion), { tam: 8, sangria: 18 });
      const fuente = typeof h.fuente === "string" ? nombreDeFuente(h.fuente) : "sin dato";
      const registros = Number(h.cantidad);
      linea(`Fuente: ${fuente}${registros ? ` · Registros: ${registros}` : ""}`, {
        tam: 8,
        sangria: 18,
        color: [0.4, 0.4, 0.4],
      });
    }
  }
  if (!alguno) linea("El proveedor no entregó hallazgos en el informe.", { sangria: 8 });

  titulo("7. Detalle de cada fuente consultada");
  const fuentes = Object.entries(r).filter(([k]) => !NO_SON_FUENTES.has(k));
  const conDatos = fuentes.filter(([, v]) => tieneAlgo(v));
  const sinDatos = fuentes.filter(([, v]) => !tieneAlgo(v)).map(([k]) => nombreDeFuente(k));
  if (conDatos.length === 0) linea("No hay detalle por fuente en el informe.", { sangria: 8 });
  for (const [clave, valor] of conDatos) {
    y -= 4;
    linea(nombreDeFuente(clave), { negrita: true, tam: 9 });
    for (const l of aplanar(valor)) linea(l, { tam: 7.5, sangria: 10 });
  }
  if (sinDatos.length > 0) {
    y -= 4;
    linea("Consultadas sin registros", { negrita: true, tam: 9 });
    linea(sinDatos.join(", "), { tam: 7.5, sangria: 10 });
  }

  titulo("8. Decisión del anfitrión");
  dato(
    "Estado",
    d.decision.estado === "aprobada"
      ? "Aprobado bajo su responsabilidad"
      : d.decision.estado === "rechazada"
      ? "Rechazado"
      : "Pendiente",
  );
  if (d.decision.estado) {
    dato("Decidió", d.decision.por);
    dato("Fecha", fecha(d.decision.en));
    dato("Nota", d.decision.nota);
  }

  y -= 12;
  linea(
    "Este informe se armó con los datos que entregó el proveedor y no es su documento oficial. Es confidencial: no debe compartirse con el huésped. La decisión de aceptar o rechazar al huésped es del anfitrión.",
    { tam: 8, color: [0.4, 0.4, 0.4] },
  );
  return await pdf.save();
}

/** La estancia, la autorización aceptada y quién decidió, para el informe. */
async function contextoDelInforme(
  admin: ReturnType<typeof createClient>,
  invitado: {
    visita_id: string;
    terminos_documento_id: string | null;
    terminos_aceptados_en: string | null;
    revision_anfitrion_por: string | null;
  } | null,
) {
  const sinDatos = {
    estancia: { alojamiento: "sin dato", desde: null, hasta: null, anfitrion: null },
    autorizacion: { documento: null, aceptadaEn: invitado?.terminos_aceptados_en ?? null },
    revisor: null as string | null,
  };
  if (!invitado) return sinDatos;

  const { data: visita } = await admin
    .from("visita")
    .select(
      "fecha_desde, fecha_hasta, unidad_id, unidad:unidad_id(codigo, torre:torre_id(nombre), condominio:condominio_id(nombre))",
    )
    .eq("id", invitado.visita_id)
    .maybeSingle();
  const v = visita as {
    fecha_desde: string | null;
    fecha_hasta: string | null;
    unidad_id: string | null;
    unidad: {
      codigo: string | null;
      torre: { nombre: string | null } | null;
      condominio: { nombre: string | null } | null;
    } | null;
  } | null;
  const alojamiento = [v?.unidad?.condominio?.nombre, v?.unidad?.torre?.nombre, v?.unidad?.codigo]
    .filter(Boolean)
    .join(" · ");

  const nombreEnLaVivienda = async (filtro: Record<string, unknown>) => {
    if (!v?.unidad_id) return null;
    const { data } = await admin
      .from("membresia_unidad")
      .select("nombre")
      .match({ unidad_id: v.unidad_id, ...filtro })
      .limit(1)
      .maybeSingle();
    return (data as { nombre: string | null } | null)?.nombre ?? null;
  };

  let documento: string | null = null;
  if (invitado.terminos_documento_id) {
    const { data } = await admin
      .from("documento_legal")
      .select("titulo, version")
      .eq("id", invitado.terminos_documento_id)
      .maybeSingle();
    const doc = data as { titulo: string; version: string | number | null } | null;
    if (doc) documento = `${doc.titulo}${doc.version ? ` (versión ${doc.version})` : ""}`;
  }

  return {
    estancia: {
      alojamiento: alojamiento || "sin dato",
      desde: v?.fecha_desde ?? null,
      hasta: v?.fecha_hasta ?? null,
      anfitrion: await nombreEnLaVivienda({ es_anfitrion_primario: true, activo: true }),
    },
    autorizacion: { documento, aceptadaEn: invitado.terminos_aceptados_en },
    revisor: invitado.revision_anfitrion_por
      ? await nombreEnLaVivienda({ usuario_id: invitado.revision_anfitrion_por })
      : null,
  };
}

Deno.serve(async (req: Request) => {
  const previo = responderPreflight(req);
  if (previo) return previo;
  if (req.method !== "POST") return json({ error: "Método no permitido" }, 405);

  const autorizacion = req.headers.get("Authorization");
  if (!autorizacion) return json({ error: "Falta la sesión" }, 401);

  let cuerpo: { invitadoId?: string };
  try {
    cuerpo = await req.json();
  } catch {
    return json({ error: "Cuerpo inválido" }, 400);
  }
  const invitadoId = cuerpo.invitadoId;
  if (!invitadoId) return json({ error: "Falta invitadoId" }, 400);

  const url = Deno.env.get("SUPABASE_URL")!;
  const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
  const servicio = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const comoLaPersona = createClient(url, anon, {
    global: { headers: { Authorization: autorizacion } },
    auth: { persistSession: false },
  });
  const { data: esAnfitrion, error: errorPermiso } = await comoLaPersona.rpc(
    "es_anfitrion_del_invitado",
    { p_invitado_id: invitadoId },
  );
  if (errorPermiso) return json({ error: errorPermiso.message }, 500);
  if (!esAnfitrion) {
    return json({ error: "Solo el anfitrión del alojamiento puede ver este informe" }, 403);
  }

  const admin = createClient(url, servicio, { auth: { persistSession: false } });

  const { data: fila, error: errorFila } = await admin
    .from("verificacion_antecedentes")
    .select(
      "id, proveedor, respuesta, reporte_path, ejecutada_en, created_at, invitado:invitado_id(visita_id, nombre, apellidos, documento_numero, tipo_documento, documento_fecha_expedicion, fecha_nacimiento, nacionalidad, terminos_aceptados_en, terminos_documento_id, revision_anfitrion, revision_anfitrion_nota, revision_anfitrion_por, revision_anfitrion_en)",
    )
    .eq("invitado_id", invitadoId)
    .maybeSingle();
  if (errorFila) return json({ error: errorFila.message }, 500);
  if (!fila) return json({ error: "Esa persona todavía no tiene verificación" }, 404);
  if (fila.proveedor === "simulado") {
    return json({ error: "Esta verificación fue simulada: no hay informe del proveedor" }, 404);
  }

  /*
    Cuánto dura el enlace al informe, y cuántas veces y cada cuánto se espera
    a que tusdatos tenga listo su PDF: parámetros de la base desde el
    18/10/2026 (`antecedentes_informe_enlace_segundos`,
    `antecedentes_informe_intentos`, `antecedentes_informe_espera_segundos`).
  */
  let enlaceSegundos: number;
  let informeIntentos: number;
  let informeEsperaSegundos: number;
  try {
    [enlaceSegundos, informeIntentos, informeEsperaSegundos] = await Promise.all([
      parametroEntero(admin, "antecedentes_informe_enlace_segundos"),
      parametroEntero(admin, "antecedentes_informe_intentos"),
      parametroEntero(admin, "antecedentes_informe_espera_segundos"),
    ]);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }

  const firmar = async (ruta: string) => {
    const { data, error } = await admin.storage.from(BUCKET).createSignedUrl(ruta, enlaceSegundos);
    if (error || !data) return json({ error: "No se pudo abrir el informe" }, 502);
    return json({ enlace: data.signedUrl }, 200);
  };

  if (fila.reporte_path) return await firmar(fila.reporte_path);

  const respuesta = (fila.respuesta ?? {}) as Record<string, unknown>;
  const reporteId = typeof respuesta.reporteId === "string" ? respuesta.reporteId : null;
  const invitado = fila.invitado as unknown as {
    visita_id: string;
    nombre: string | null;
    apellidos: string | null;
    documento_numero: string | null;
    tipo_documento: string | null;
    documento_fecha_expedicion: string | null;
    fecha_nacimiento: string | null;
    nacionalidad: string | null;
    terminos_aceptados_en: string | null;
    terminos_documento_id: string | null;
    revision_anfitrion: string | null;
    revision_anfitrion_nota: string | null;
    revision_anfitrion_por: string | null;
    revision_anfitrion_en: string | null;
  } | null;

  const conexion: Conexion = {
    base: (await ajustesDeTusdatos(admin)).base,
    usuario: Deno.env.get("TUSDATOS_USUARIO") ?? "",
    clave: Deno.env.get("TUSDATOS_CLAVE") ?? "",
  };

  let pdfBytes: Uint8Array | null = null;
  if (reporteId && conexion.usuario) {
    pdfBytes = await reporteEnPdf(conexion, reporteId, {
      intentos: informeIntentos,
      esperaSegundos: informeEsperaSegundos,
    }).catch(() => null);
  }
  if (!pdfBytes) {
    const informe = reporteId && conexion.usuario
      ? await reporteEnJson(conexion, reporteId).catch(() => null)
      : null;
    const contexto = await contextoDelInforme(admin, invitado);
    pdfBytes = await armarInforme({
      nombre: `${invitado?.nombre ?? ""} ${invitado?.apellidos ?? ""}`.trim() || "Sin nombre",
      documento: invitado?.documento_numero ?? "Sin documento",
      tipoDocumento: invitado?.tipo_documento ?? null,
      fechaExpedicion: invitado?.documento_fecha_expedicion ?? null,
      nacionalidad: invitado?.nacionalidad ?? null,
      fechaNacimiento: invitado?.fecha_nacimiento ?? null,
      nivel: typeof respuesta.nivel === "string" ? respuesta.nivel : null,
      motivo: typeof respuesta.motivo === "string" ? respuesta.motivo : null,
      fuentesConError: Array.isArray(respuesta.fuentesConError)
        ? (respuesta.fuentesConError as unknown[]).map(String)
        : [],
      validado: typeof respuesta.validado === "boolean" ? respuesta.validado : null,
      reporteId,
      consultadaEn: fila.ejecutada_en ?? fila.created_at ?? null,
      pruebas: fila.proveedor === "tusdatos-pruebas",
      estancia: contexto.estancia,
      autorizacion: contexto.autorizacion,
      decision: {
        estado: invitado?.revision_anfitrion ?? null,
        nota: invitado?.revision_anfitrion_nota ?? null,
        por: contexto.revisor,
        en: invitado?.revision_anfitrion_en ?? null,
      },
      informe,
    });
  }

  // La marca va en todas las páginas, también en las del PDF oficial.
  let estampado: Uint8Array;
  try {
    const doc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
    const fuente = await doc.embedFont(StandardFonts.HelveticaBold);
    // El día de la plataforma, no el de Londres (`toISOString`).
    const { data: hoyDeLaPlataforma } = await admin.rpc("hoy_en_la_plataforma");
    const hoy = String(hoyDeLaPlataforma ?? new Date().toISOString().slice(0, 10));
    for (const pagina of doc.getPages()) {
      estamparMarca(pagina, fuente, `Veciyo · informe para el anfitrión · ${hoy} · no compartir con el huésped`);
    }
    estampado = await doc.save();
  } catch {
    return json({ error: "El informe del proveedor no se pudo procesar" }, 502);
  }

  const ruta = `${invitado?.visita_id ?? "sin-visita"}/${invitadoId}.pdf`;
  const { error: errorSubida } = await admin.storage
    .from(BUCKET)
    .upload(ruta, estampado, { contentType: "application/pdf", upsert: true });
  if (errorSubida) return json({ error: "No se pudo guardar el informe" }, 502);

  await admin.from("verificacion_antecedentes").update({ reporte_path: ruta }).eq("id", fila.id);

  return await firmar(ruta);
});
