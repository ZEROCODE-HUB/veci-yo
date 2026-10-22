/**
 * enviar-push · manda como push al celular un aviso de la campana (OneSignal)
 *
 * La llama la base, no la app: el disparador `notificacion_mandar_push` anota
 * el envío en `envio_push` y hace un `net.http_post` aquí con la clave de
 * servicio y el id de la notificación. Esta función lee el aviso, se lo pasa a
 * OneSignal y deja en la misma fila en qué quedó.
 *
 * Lo único que falta para que salgan pushes de verdad es la credencial, que se
 * pone como secreto y no toca ni una línea de código:
 *
 *   ONESIGNAL_REST_API_KEY  (OneSignal › Settings › Keys & IDs)
 *
 * Sin ella responde 200 y deja la fila en «error» diciendo que falta: el aviso
 * de la campana ya existe y romperlo porque no haya push sería peor.
 *
 * El id de la app (`onesignal_app_id`) es un parámetro de la base: no es
 * secreto, lo lleva la app.
 */
import { createClient } from "jsr:@supabase/supabase-js@2";
import { CORS, responderPreflight } from "../_compartido/cors.ts";
import { parametro } from "../_compartido/parametros.ts";
import { armarPush, leerRespuestaOneSignal, URL_ONESIGNAL } from "../_compartido/onesignal.ts";

const json = (cuerpo: unknown, status: number) =>
  new Response(JSON.stringify(cuerpo), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });

Deno.serve(async (req: Request) => {
  const previo = responderPreflight(req);
  if (previo) return previo;

  if (req.method !== "POST") return json({ error: "Método no permitido" }, 405);

  let cuerpo: { notificacionId?: string };
  try {
    cuerpo = await req.json();
  } catch {
    return json({ error: "Cuerpo inválido" }, 400);
  }
  const notificacionId = cuerpo.notificacionId;
  if (!notificacionId) return json({ error: "Falta notificacionId" }, 400);

  const url = Deno.env.get("SUPABASE_URL")!;
  const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
  const servicio = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const autorizacion = req.headers.get("Authorization") ?? "";

  /*
    Solo la base la llama. No se compara la clave letra por letra (la
    plataforma le da a la función la suya en otro formato que la del Vault, ya
    pasó en `sincronizar-calendario`): se le pide a la base algo que solo el
    servicio puede pedir, igual que en `verificar-antecedentes`.
  */
  const comoQuienLlama = createClient(url, anon, {
    global: { headers: { Authorization: autorizacion } },
  });
  const { error: noEsServicio } = await comoQuienLlama.rpc("valor_configuracion", {
    p_clave: "push_activo",
  });
  if (noEsServicio) return json({ error: "Solo la base manda avisos al celular" }, 403);

  const admin = createClient(url, servicio, { auth: { persistSession: false } });

  const anotar = async (cambios: Record<string, unknown>) => {
    const { error } = await admin.from("envio_push").update(cambios).eq("notificacion_id", notificacionId);
    return error?.message ?? null;
  };

  const { data: aviso, error: errorAviso } = await admin
    .from("notificacion")
    .select("id, usuario_id, tipo, titulo, mensaje, entidad_tipo, entidad_id")
    .eq("id", notificacionId)
    .maybeSingle();
  if (errorAviso) return json({ error: errorAviso.message }, 500);
  if (!aviso) return json({ error: "Ese aviso no existe" }, 404);

  const clave = Deno.env.get("ONESIGNAL_REST_API_KEY");
  if (!clave) {
    const fallo = await anotar({ estado: "error", detalle: "Falta el secreto ONESIGNAL_REST_API_KEY en las funciones" });
    return json({ enviado: false, motivo: "sin_credencial", fallo }, 200);
  }

  let appId: string;
  try {
    appId = await parametro(admin, "onesignal_app_id");
  } catch (e) {
    const detalle = e instanceof Error ? e.message : String(e);
    await anotar({ estado: "error", detalle });
    return json({ enviado: false, motivo: detalle }, 200);
  }

  let resultado;
  try {
    const respuesta = await fetch(URL_ONESIGNAL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Key ${clave}` },
      body: JSON.stringify(
        armarPush(
          {
            id: aviso.id,
            usuarioId: aviso.usuario_id,
            tipo: aviso.tipo,
            titulo: aviso.titulo,
            mensaje: aviso.mensaje,
            entidadTipo: aviso.entidad_tipo,
            entidadId: aviso.entidad_id,
          },
          appId,
        ),
      ),
    });
    const texto = await respuesta.text();
    let leido: unknown = texto;
    try {
      leido = JSON.parse(texto);
    } catch {
      // Se queda como texto: también sirve de detalle.
    }
    resultado = leerRespuestaOneSignal(respuesta.status, leido);
  } catch (e) {
    resultado = {
      estado: "error" as const,
      onesignalId: null,
      detalle: `No se pudo hablar con OneSignal: ${e instanceof Error ? e.message : String(e)}`,
    };
  }

  const fallo = await anotar({
    estado: resultado.estado,
    onesignal_id: resultado.onesignalId,
    detalle: resultado.detalle,
    enviado_en: resultado.estado === "enviado" ? new Date().toISOString() : null,
  });

  return json({ enviado: resultado.estado === "enviado", estado: resultado.estado, fallo }, 200);
});
