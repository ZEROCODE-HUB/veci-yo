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
  URL_DE_PRODUCCION,
} from "../_compartido/tusdatos.ts";
import { CORS, responderPreflight } from "../_compartido/cors.ts";

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
  nivel: string | null;
  motivo: string | null;
  fuentesConError: string[];
  informe: Record<string, unknown> | null;
}

/** El que se arma cuando Tus Datos no da su PDF (su ambiente de pruebas). */
async function armarInforme(d: Datos): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const normal = await pdf.embedFont(StandardFonts.Helvetica);
  const negrita = await pdf.embedFont(StandardFonts.HelveticaBold);
  let pagina = pdf.addPage([595, 842]);
  let y = 800;

  const linea = (texto: string, opciones: { negrita?: boolean; tam?: number } = {}) => {
    const tam = opciones.tam ?? 10;
    const fuente = opciones.negrita ? negrita : normal;
    // Partir a mano: pdf-lib no hace saltos de línea solo.
    const palabras = seguro(texto).split(/\s+/);
    let actual = "";
    const filas: string[] = [];
    for (const p of palabras) {
      const prueba = actual ? `${actual} ${p}` : p;
      if (fuente.widthOfTextAtSize(prueba, tam) > 520 && actual) {
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
      pagina.drawText(f, { x: 36, y, size: tam, font: fuente });
      y -= tam + 4;
    }
  };

  linea("Informe de antecedentes", { negrita: true, tam: 16 });
  y -= 6;
  linea(`Persona: ${d.nombre}`);
  linea(`Documento: ${d.documento}`);
  linea(`Nivel de hallazgos: ${d.nivel ?? "sin dato"}`);
  if (d.motivo) linea(`Resultado: ${d.motivo}`);
  if (d.fuentesConError.length > 0) {
    linea(`Fuentes que no respondieron: ${d.fuentesConError.join(", ")}`);
  }
  y -= 8;
  linea("Hallazgos por fuente", { negrita: true, tam: 12 });

  const fuentes = Object.entries(d.informe ?? {}).filter(
    ([, v]) => Array.isArray(v) && v.length > 0,
  ) as [string, unknown[]][];
  if (fuentes.length === 0) linea("No hay hallazgos registrados en el informe.");
  for (const [fuente, filas] of fuentes) {
    y -= 4;
    linea(fuente.replace(/_/g, " ").toUpperCase(), { negrita: true });
    for (const fila of filas.slice(0, 20)) {
      if (fila && typeof fila === "object") {
        const partes = Object.entries(fila as Record<string, unknown>)
          .filter(([, v]) => typeof v === "string" || typeof v === "number")
          .slice(0, 8)
          .map(([k, v]) => `${k.replace(/_/g, " ").toLowerCase()}: ${v}`);
        linea(`• ${partes.join(" · ")}`, { tam: 8 });
      } else {
        linea(`• ${String(fila)}`, { tam: 8 });
      }
    }
  }
  y -= 8;
  linea(
    "Este informe se armó con los datos que entregó el proveedor. No es el documento oficial del proveedor.",
    { tam: 8 },
  );
  return await pdf.save();
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
    .select("id, proveedor, respuesta, reporte_path, invitado:invitado_id(visita_id, nombre, apellidos, documento_numero)")
    .eq("invitado_id", invitadoId)
    .maybeSingle();
  if (errorFila) return json({ error: errorFila.message }, 500);
  if (!fila) return json({ error: "Esa persona todavía no tiene verificación" }, 404);
  if (fila.proveedor === "simulado") {
    return json({ error: "Esta verificación fue simulada: no hay informe del proveedor" }, 404);
  }

  const firmar = async (ruta: string) => {
    const { data, error } = await admin.storage.from(BUCKET).createSignedUrl(ruta, 300);
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
  } | null;

  const conexion: Conexion = {
    base: (Deno.env.get("TUSDATOS_URL") ?? URL_DE_PRODUCCION).replace(/\/+$/, ""),
    usuario: Deno.env.get("TUSDATOS_USUARIO") ?? "",
    clave: Deno.env.get("TUSDATOS_CLAVE") ?? "",
  };

  let pdfBytes: Uint8Array | null = null;
  if (reporteId && conexion.usuario) {
    pdfBytes = await reporteEnPdf(conexion, reporteId).catch(() => null);
  }
  if (!pdfBytes) {
    const informe = reporteId && conexion.usuario
      ? await reporteEnJson(conexion, reporteId).catch(() => null)
      : null;
    pdfBytes = await armarInforme({
      nombre: `${invitado?.nombre ?? ""} ${invitado?.apellidos ?? ""}`.trim() || "Sin nombre",
      documento: invitado?.documento_numero ?? "Sin documento",
      nivel: typeof respuesta.nivel === "string" ? respuesta.nivel : null,
      motivo: typeof respuesta.motivo === "string" ? respuesta.motivo : null,
      fuentesConError: Array.isArray(respuesta.fuentesConError)
        ? (respuesta.fuentesConError as unknown[]).map(String)
        : [],
      informe,
    });
  }

  // La marca va en todas las páginas, también en las del PDF oficial.
  let estampado: Uint8Array;
  try {
    const doc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
    const fuente = await doc.embedFont(StandardFonts.HelveticaBold);
    const hoy = new Date().toISOString().slice(0, 10);
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
