/**
 * enviar-reportes-mensuales · los reportes del mes anterior, por correo
 *
 * Hueco 7 (28/10/2026). La llama una vez por edificio la pasada diaria
 * `enviar_reportes_mensuales()` de la base, con la clave de servicio, el día
 * que la administración eligió. Recibe a quién va cada reporte --cada
 * coadministrador solo los que su permiso le deja ver-- y aquí se consultan
 * los datos, se arman los Excel (el mismo formato que la descarga de la
 * aplicación) y se manda un correo a cada persona con los suyos adjuntos.
 *
 * Solo la base puede pedirlo: con la clave pública alguien podría hacerse
 * mandar los reportes de un edificio ajeno.
 */
import { CORS, responderPreflight } from "../_compartido/cors.ts";
import { componer } from "../_compartido/maqueta-correo.mjs";
import { clienteRpcPorFetch, parametro } from "../_compartido/parametros.ts";
import { excelDeReporte, nombreDeArchivo, TITULO, type IdReporte } from "../_compartido/reporte-excel.ts";

interface Destinatario {
  correo: string;
  nombre?: string;
  reportes: IdReporte[] | null;
}

interface Peticion {
  condominioId: string;
  condominio: string;
  desde: string;
  hasta: string;
  destinatarios: Destinatario[];
}

const FUNCION: Record<IdReporte, string> = {
  visitantes: "datos_reporte_visitantes",
  correspondencia: "datos_reporte_correspondencia",
  "areas-comunes": "datos_reporte_areas_comunes",
};

const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

const json = (cuerpo: unknown, status: number) =>
  new Response(JSON.stringify(cuerpo), { status, headers: { "Content-Type": "application/json", ...CORS } });

/** El `role` del JWT, sin verificar la firma (eso ya lo hizo la pasarela). */
function rolDelToken(autorizacion: string): string | null {
  const partes = autorizacion.replace(/^Bearer\s+/i, "").split(".");
  if (partes.length !== 3) return null;
  try {
    const base64 = partes[1].replace(/-/g, "+").replace(/_/g, "/");
    return (JSON.parse(atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, "="))) as { role?: string }).role ?? null;
  } catch {
    return null;
  }
}

function credenciales() {
  const clave = Deno.env.get("RESEND_API_KEY") ?? Deno.env.get("SMTP_CLAVE");
  const desde = Deno.env.get("CORREO_DESDE") ?? Deno.env.get("SMTP_DESDE");
  return clave && desde ? { clave, desde } : null;
}

Deno.serve(async (req: Request) => {
  const previo = responderPreflight(req);
  if (previo) return previo;
  if (req.method !== "POST") return json({ error: "Método no permitido" }, 405);

  if (rolDelToken(req.headers.get("Authorization") ?? "") !== "service_role") {
    return json({ error: "Solo la base puede pedir el envío de los reportes" }, 401);
  }

  let p: Peticion;
  try {
    p = await req.json();
  } catch {
    return json({ error: "Cuerpo inválido" }, 400);
  }
  if (!p?.condominioId || !p.desde || !p.hasta || !Array.isArray(p.destinatarios)) {
    return json({ error: "Faltan campos: condominioId, desde, hasta, destinatarios" }, 400);
  }

  const url = Deno.env.get("SUPABASE_URL");
  const claveServicio = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !claveServicio) return json({ error: "La función no está configurada" }, 500);
  const base = clienteRpcPorFetch(url, claveServicio);

  const { data: zona } = await base.rpc("zona_horaria_del_condominio", { p_condominio_id: p.condominioId });
  const zonaHoraria = typeof zona === "string" && zona ? zona : "America/Bogota";

  // Cada reporte se consulta y se arma una vez, aunque lo reciban varios.
  const pedidos = new Set(p.destinatarios.flatMap((d) => d.reportes ?? []));
  const archivos = new Map<IdReporte, { filename: string; content: string; filas: number }>();
  const generadoEn = new Date();
  for (const id of pedidos) {
    const { data, error } = await base.rpc(FUNCION[id], {
      p_condominio_id: p.condominioId,
      p_desde: p.desde,
      p_hasta: p.hasta,
    });
    if (error) return json({ error: `No se pudo consultar ${id}: ${error.message}` }, 502);
    const filas = (data ?? []) as Record<string, unknown>[];
    archivos.set(id, {
      filename: nombreDeArchivo(id, p.desde, p.hasta),
      content: excelDeReporte({ id, filas, condominio: p.condominio, desde: p.desde, hasta: p.hasta, zona: zonaHoraria, generadoEn }),
      filas: filas.length,
    });
  }

  // Las cuentas de prueba no reciben correos (rebotan y bajan la reputación).
  let sinEnvio: string[] = [];
  try {
    sinEnvio = (JSON.parse(await parametro(base, "correo_dominios_sin_envio")) as string[]).map((d) => d.toLowerCase());
  } catch {
    // Sin el parámetro se manda igual.
  }

  const mes = `${MESES[Number(p.desde.slice(5, 7)) - 1]} de ${p.desde.slice(0, 4)}`;
  const c = credenciales();
  const resultado: { correo: string; enviado: boolean; motivo?: string }[] = [];

  for (const d of p.destinatarios) {
    const suyos = (d.reportes ?? []).map((id) => ({ id, ...archivos.get(id)! }));
    if (!suyos.length) {
      resultado.push({ correo: d.correo, enviado: false, motivo: "Sin reportes que pueda ver" });
      continue;
    }
    if (sinEnvio.includes(d.correo.split("@")[1]?.toLowerCase() ?? "")) {
      resultado.push({ correo: d.correo, enviado: false, motivo: "Cuenta de prueba" });
      continue;
    }

    const asunto = `Reportes de ${mes} · ${p.condominio}`;
    const { html, texto } = componer({
      titulo: `Los reportes de ${mes}`,
      saludo: d.nombre?.trim() ? `Hola ${d.nombre.trim()},` : "Hola,",
      parrafos: [
        `Te mandamos los reportes de ${p.condominio} del ${p.desde.slice(8, 10)}/${p.desde.slice(5, 7)} al ${p.hasta.slice(8, 10)}/${p.hasta.slice(5, 7)}/${p.hasta.slice(0, 4)}, en Excel:`,
        ...suyos.map((r) => `· ${TITULO[r.id]}: ${r.filas === 1 ? "1 registro" : `${r.filas} registros`}.`),
      ],
      nota: "Te llegan porque la administración del edificio encendió el envío mensual en Reportes. Desde ahí mismo se apaga o se cambia el día.",
    });

    if (!c) {
      resultado.push({ correo: d.correo, enviado: false, motivo: "El servidor de correo no está configurado" });
      continue;
    }
    const respuesta = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${c.clave}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: c.desde,
        to: [d.correo],
        subject: asunto,
        html,
        text: texto,
        attachments: suyos.map((r) => ({ filename: r.filename, content: r.content })),
      }),
    });
    resultado.push(
      respuesta.ok
        ? { correo: d.correo, enviado: true }
        : { correo: d.correo, enviado: false, motivo: `Resend respondió ${respuesta.status}: ${await respuesta.text()}` },
    );
  }

  return json({ resultado, reportes: [...archivos].map(([id, a]) => ({ id, filas: a.filas })) }, 200);
});
