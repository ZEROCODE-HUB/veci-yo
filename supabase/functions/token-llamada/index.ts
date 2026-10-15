/**
 * token-llamada · el permiso para entrar a la sala de voz de una llamada
 *
 * El intercomunicador (14/10/2026): la voz va por LiveKit, en un servidor
 * propio. LiveKit no deja entrar a una sala sin un token firmado con su clave;
 * esta función lo firma **solo** para quien está en la llamada —quien llama, o
 * quien la recibe— y solo mientras suena o está en curso. Quién está lo decide
 * la base (`esta_en_la_llamada`), con la sesión de quien pide.
 *
 * Necesita tres secretos: `LIVEKIT_URL` (wss://...), `LIVEKIT_API_KEY` y
 * `LIVEKIT_API_SECRET`. Mientras no haya dominio (15/10/2026) la voz sale por
 * un túnel gratis de Cloudflare cuya dirección cambia si el servidor se
 * reinicia: entonces `LIVEKIT_URL` es la dirección `http://.../quicktunnel`
 * donde el túnel publica su nombre de ahora, y se pregunta en cada llamada. Sin ellos responde 503 diciendo qué falta: el
 * intercomunicador no está conectado todavía, y se dice en vez de fingir.
 */
import { createClient } from "jsr:@supabase/supabase-js@2";
import { AccessToken } from "npm:livekit-server-sdk@2.13.3";
import { CORS, responderPreflight } from "../_compartido/cors.ts";

const json = (cuerpo: unknown, status: number) =>
  new Response(JSON.stringify(cuerpo), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });

/** La dirección segura de la voz: fija, o la que el túnel publica ahora. */
async function direccionDeLaVoz(servidor: string): Promise<string | null> {
  if (!servidor.startsWith("http://")) return servidor;
  try {
    const r = await fetch(servidor, { signal: AbortSignal.timeout(5000) });
    const { hostname } = (await r.json()) as { hostname?: string };
    return hostname ? `wss://${hostname}` : null;
  } catch {
    return null;
  }
}

Deno.serve(async (req: Request) => {
  const previo = responderPreflight(req);
  if (previo) return previo;
  if (req.method !== "POST") return json({ error: "Método no permitido" }, 405);

  const autorizacion = req.headers.get("Authorization");
  if (!autorizacion) return json({ error: "Falta la sesión" }, 401);

  let cuerpo: { llamadaId?: string };
  try {
    cuerpo = await req.json();
  } catch {
    return json({ error: "Cuerpo inválido" }, 400);
  }
  if (!cuerpo.llamadaId) return json({ error: "Falta llamadaId" }, 400);

  const servidor = Deno.env.get("LIVEKIT_URL");
  const clave = Deno.env.get("LIVEKIT_API_KEY");
  const secreto = Deno.env.get("LIVEKIT_API_SECRET");
  if (!servidor || !clave || !secreto) {
    return json(
      { error: "El intercomunicador todavía no está conectado a su servidor de voz" },
      503,
    );
  }

  const direccion = await direccionDeLaVoz(servidor);
  if (!direccion) {
    return json({ error: "El servidor de voz no responde ahora" }, 503);
  }

  const comoLaPersona = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: autorizacion } }, auth: { persistSession: false } },
  );

  const { data: usuario } = await comoLaPersona.auth.getUser();
  if (!usuario?.user) return json({ error: "Sesión no válida" }, 401);

  // Con la sesión de quien pide: RLS solo le deja ver sus llamadas.
  const { data: llamada, error } = await comoLaPersona
    .from("llamada_internet")
    .select("id, sala, estado")
    .eq("id", cuerpo.llamadaId)
    .maybeSingle();
  if (error) return json({ error: error.message }, 500);
  if (!llamada) return json({ error: "Esa llamada no es tuya" }, 403);
  if (llamada.estado !== "sonando" && llamada.estado !== "en_curso") {
    return json({ error: "Esa llamada ya terminó" }, 409);
  }

  const token = new AccessToken(clave, secreto, {
    identity: usuario.user.id,
    ttl: "2h",
  });
  token.addGrant({
    room: llamada.sala,
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
  });

  return json({ servidor: direccion, token: await token.toJwt(), sala: llamada.sala }, 200);
});
