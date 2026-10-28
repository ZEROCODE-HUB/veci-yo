/**
 * avisar-llamada · que la llamada por la app suene en el celular (28/10/2026)
 *
 * La llama la base (`avisar_llamada_al_celular`) con la clave de servicio:
 * al empezar a sonar una llamada (`evento = sonando`) y al dejar de sonar
 * (`fin`). Manda el push a quienes les suena (`quienes_reciben_la_llamada`).
 *
 *   · OneSignal: Android y el aviso del iPhone (`_compartido/llamada.ts`).
 *   · Apple VoIP (CallKit): a los iPhone con token en `dispositivo_voip`, si
 *     están los secretos de la llave APNs. Mientras no haya cuenta de Apple
 *     no están, y esos iPhone reciben el aviso de OneSignal como todos:
 *
 *       APNS_TEAM_ID     el Team ID de la cuenta de desarrollador
 *       APNS_KEY_ID      el id de la llave «Apple Push Notifications service»
 *       APNS_LLAVE_P8    el contenido del archivo .p8 de esa llave
 *       APNS_TOPIC_VOIP  el bundle id seguido de «.voip» (com.veciyo.app.voip)
 *
 * Responde 200 aunque no mande nada (sin credencial, sin nadie a quien): una
 * llamada no puede fallar porque no haya push.
 */
import { createClient } from "jsr:@supabase/supabase-js@2";
import { CORS, responderPreflight } from "../_compartido/cors.ts";
import { parametro, parametroEntero } from "../_compartido/parametros.ts";
import { leerRespuestaOneSignal, URL_ONESIGNAL } from "../_compartido/onesignal.ts";
import { armarPushDeLlamada, armarVoip, deQuienLlama, type OrigenLlamada } from "../_compartido/llamada.ts";
import { firmarLlamada } from "../_compartido/firmaDeLlamada.ts";

const json = (cuerpo: unknown, status: number) =>
  new Response(JSON.stringify(cuerpo), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });

function base64url(datos: ArrayBuffer | Uint8Array | string): string {
  const bytes = typeof datos === "string" ? new TextEncoder().encode(datos) : new Uint8Array(datos);
  let binario = "";
  for (const b of bytes) binario += String.fromCharCode(b);
  return btoa(binario).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** El JWT con el que Apple acepta los push (ES256 con la llave .p8). */
async function jwtDeApple(equipo: string, llaveId: string, p8: string): Promise<string> {
  const pem = p8.replace(/-----[^-]+-----/g, "").replace(/\s+/g, "");
  const der = Uint8Array.from(atob(pem), (c) => c.charCodeAt(0));
  const llave = await crypto.subtle.importKey("pkcs8", der, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  const cabecera = base64url(JSON.stringify({ alg: "ES256", kid: llaveId }));
  const cuerpo = base64url(JSON.stringify({ iss: equipo, iat: Math.floor(Date.now() / 1000) }));
  const firma = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, llave, new TextEncoder().encode(`${cabecera}.${cuerpo}`));
  return `${cabecera}.${cuerpo}.${base64url(firma)}`;
}

Deno.serve(async (req: Request) => {
  const previo = responderPreflight(req);
  if (previo) return previo;
  if (req.method !== "POST") return json({ error: "Método no permitido" }, 405);

  let cuerpo: { llamadaId?: string; evento?: string; para?: string[] | null };
  try {
    cuerpo = await req.json();
  } catch {
    return json({ error: "Cuerpo inválido" }, 400);
  }
  const llamadaId = cuerpo.llamadaId;
  const evento = cuerpo.evento === "fin" ? "fin" : cuerpo.evento === "sonando" ? "sonando" : null;
  if (!llamadaId || !evento) return json({ error: "Falta llamadaId o evento" }, 400);

  const url = Deno.env.get("SUPABASE_URL")!;
  const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
  const servicio = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // Solo la base la llama: lo mismo que `enviar-push`.
  const comoQuienLlama = createClient(url, anon, {
    global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
  });
  const { error: noEsServicio } = await comoQuienLlama.rpc("valor_configuracion", { p_clave: "push_activo" });
  if (noEsServicio) return json({ error: "Solo la base avisa de las llamadas" }, 403);

  const admin = createClient(url, servicio, { auth: { persistSession: false } });

  // La llamada y a quién avisar. Si la borraron, la base manda la lista.
  const { data: llamada } = await admin
    .from("llamada_internet")
    .select("id, origen, de:de_unidad_id ( codigo )")
    .eq("id", llamadaId)
    .maybeSingle();
  let para: string[] = Array.isArray(cuerpo.para) ? cuerpo.para : [];
  if (llamada) {
    const { data, error } = await admin.rpc("quienes_reciben_la_llamada", { p_llamada_id: llamadaId });
    if (error) return json({ error: error.message }, 500);
    para = ((data ?? []) as { usuario_id: string }[]).map((f) => f.usuario_id);
  }
  if (para.length === 0) return json({ enviado: false, motivo: "nadie a quien avisar" }, 200);

  const de = (llamada?.de as { codigo: string } | null | undefined)?.codigo ?? null;
  const deQuien = deQuienLlama((llamada?.origen as OrigenLlamada | null | undefined) ?? null, de);

  let segundos: number;
  let appId: string;
  try {
    segundos = await parametroEntero(admin, "llamada_segundos_sin_contestar");
    appId = await parametro(admin, "onesignal_app_id");
  } catch (e) {
    return json({ enviado: false, motivo: e instanceof Error ? e.message : String(e) }, 200);
  }

  const resultado: Record<string, unknown> = {};

  // iPhone con CallKit: push VoIP a Apple, solo al empezar a sonar.
  let conCallKit = new Set<string>();
  const equipo = Deno.env.get("APNS_TEAM_ID");
  const llaveId = Deno.env.get("APNS_KEY_ID");
  const p8 = Deno.env.get("APNS_LLAVE_P8");
  const topic = Deno.env.get("APNS_TOPIC_VOIP");
  if (evento === "sonando" && equipo && llaveId && p8 && topic) {
    const { data: iphones } = await admin
      .from("dispositivo_voip")
      .select("usuario_id, token, entorno")
      .in("usuario_id", para);
    if (iphones && iphones.length > 0) {
      try {
        const jwt = await jwtDeApple(equipo, llaveId, p8);
        const envios = await Promise.all(
          iphones.map(async (d) => {
            const servidor = d.entorno === "desarrollo" ? "api.sandbox.push.apple.com" : "api.push.apple.com";
            const r = await fetch(`https://${servidor}/3/device/${d.token}`, {
              method: "POST",
              headers: {
                authorization: `bearer ${jwt}`,
                "apns-topic": topic,
                "apns-push-type": "voip",
                "apns-priority": "10",
                "apns-expiration": String(Math.floor(Date.now() / 1000) + segundos),
              },
              body: JSON.stringify(armarVoip({ llamadaId, deQuien, segundos })),
            });
            // Un token que Apple ya no reconoce se borra: el iPhone cambió o se desinstaló.
            if (r.status === 410 || r.status === 400) {
              await admin.from("dispositivo_voip").delete().eq("token", d.token);
            }
            return { usuarioId: d.usuario_id, ok: r.ok, status: r.status };
          }),
        );
        conCallKit = new Set(envios.filter((e) => e.ok).map((e) => e.usuarioId));
        resultado.voip = envios.map((e) => e.status);
      } catch (e) {
        resultado.voip = `No se pudo hablar con Apple: ${e instanceof Error ? e.message : String(e)}`;
      }
    }
  }

  // Todos los demás por OneSignal. A quien ya le sonó con CallKit, no: dos
  // veces la misma llamada.
  const porOneSignal = para.filter((id) => !conCallKit.has(id));
  const clave = Deno.env.get("ONESIGNAL_REST_API_KEY");
  const mandar = async (cuerpo: unknown) => {
    try {
      const r = await fetch(URL_ONESIGNAL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Key ${clave}` },
        body: JSON.stringify(cuerpo),
      });
      const texto = await r.text();
      let leido: unknown = texto;
      try {
        leido = JSON.parse(texto);
      } catch {
        // Se queda como texto.
      }
      return leerRespuestaOneSignal(r.status, leido);
    } catch (e) {
      return `No se pudo hablar con OneSignal: ${e instanceof Error ? e.message : String(e)}`;
    }
  };
  if (porOneSignal.length > 0 && clave) {
    /*
      Al sonar, un aviso por persona: lleva la firma con la que el APK puede
      rechazar sin sesión (`rechazar-llamada`). Al terminar, uno para todos.
    */
    const secreto = Deno.env.get("LLAMADA_FIRMA_SECRETO");
    if (evento === "sonando" && secreto) {
      const urlRechazo = `${url}/functions/v1/rechazar-llamada`;
      resultado.onesignal = await Promise.all(
        porOneSignal.map(async (usuarioId) =>
          mandar(
            armarPushDeLlamada({
              appId, evento, llamadaId, deQuien, para: [usuarioId], segundos,
              rechazo: { usuarioId, firma: await firmarLlamada(secreto, llamadaId, usuarioId), url: urlRechazo },
            }),
          )
        ),
      );
    } else {
      resultado.onesignal = await mandar(
        armarPushDeLlamada({ appId, evento, llamadaId, deQuien, para: porOneSignal, segundos }),
      );
    }
  } else if (!clave) {
    resultado.onesignal = "Falta el secreto ONESIGNAL_REST_API_KEY";
  }

  return json({ evento, para: para.length, ...resultado }, 200);
});
