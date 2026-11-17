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
import { parametroEntero } from "../_compartido/parametros.ts";

const json = (cuerpo: unknown, status: number) =>
  new Response(JSON.stringify(cuerpo), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });

/**
 * La dirección del túnel, recordada un minuto (17/11/2026): preguntarla cuesta
 * ~0,5 s por llamada, y quien contesta pide su permiso justo después que quien
 * llama. Un minuto es poco para que un reinicio del túnel deje una dirección
 * vieja mucho tiempo.
 */
let tunelRecordado: { direccion: string; hasta: number } | null = null;

/** La dirección segura de la voz: fija, o la que el túnel publica ahora. */
async function direccionDeLaVoz(servidor: string): Promise<string | null> {
  if (!servidor.startsWith("http://")) return servidor;
  if (tunelRecordado && tunelRecordado.hasta > Date.now()) return tunelRecordado.direccion;
  try {
    const r = await fetch(servidor, { signal: AbortSignal.timeout(5000) });
    const { hostname } = (await r.json()) as { hostname?: string };
    if (!hostname) return null;
    tunelRecordado = { direccion: `wss://${hostname}`, hasta: Date.now() + 60_000 };
    return tunelRecordado.direccion;
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

  const comoLaPersona = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: autorizacion } }, auth: { persistSession: false } },
  );
  /*
    Cuánto dura el permiso para estar en la sala --en la práctica, lo más que
    puede durar una llamada-- es el parámetro `llamada_permiso_horas` (hasta
    el 18/10/2026, «2h» escrito aquí). Es interno, así que se lee con la clave
    de servicio.
  */
  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  /*
    Las cuatro preguntas a la vez (17/11/2026): antes iban en fila y el permiso
    tardaba lo que las cuatro juntas, mientras la persona esperaba a oír.
  */
  const [direccion, usuarioPedido, llamadaPedida, horas] = await Promise.all([
    direccionDeLaVoz(servidor),
    comoLaPersona.auth.getUser(),
    // Con la sesión de quien pide: RLS solo le deja ver sus llamadas.
    comoLaPersona
      .from("llamada_internet")
      .select("id, sala, estado")
      .eq("id", cuerpo.llamadaId)
      .maybeSingle(),
    parametroEntero(admin, "llamada_permiso_horas").then(
      (valor) => ({ valor, error: null as string | null }),
      (e: unknown) => ({ valor: 0, error: e instanceof Error ? e.message : String(e) }),
    ),
  ]);

  if (!direccion) {
    return json({ error: "El servidor de voz no responde ahora" }, 503);
  }
  const usuario = usuarioPedido.data;
  if (!usuario?.user) return json({ error: "Sesión no válida" }, 401);

  const { data: llamada, error } = llamadaPedida;
  if (error) return json({ error: error.message }, 500);
  if (!llamada) return json({ error: "Esa llamada no es tuya" }, 403);
  if (llamada.estado !== "sonando" && llamada.estado !== "en_curso") {
    return json({ error: "Esa llamada ya terminó" }, 409);
  }

  if (horas.error) return json({ error: horas.error }, 500);
  const horasDePermiso = horas.valor;

  const token = new AccessToken(clave, secreto, {
    identity: usuario.user.id,
    ttl: `${horasDePermiso}h`,
  });
  token.addGrant({
    room: llamada.sala,
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
  });

  return json({ servidor: direccion, token: await token.toJwt(), sala: llamada.sala }, 200);
});
