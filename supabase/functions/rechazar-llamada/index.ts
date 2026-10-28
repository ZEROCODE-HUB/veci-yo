/**
 * rechazar-llamada · «Rechazar» con la app cerrada (28/10/2026)
 *
 * La llama el código de Android del APK (`RechazarLlamadaReceiver` y
 * `LlamadaActivity`) cuando se pulsa «Rechazar» en la llamada entrante sin la
 * app abierta: no hay sesión. En lugar de la sesión trae la firma que vino en
 * el aviso (`_compartido/firmaDeLlamada.ts`), que solo vale para esa llamada y
 * esa persona.
 *
 * Se despliega sin comprobar el JWT (`--no-verify-jwt`): quien llama no tiene
 * ninguno. La firma es lo que se comprueba.
 *
 * Hace lo mismo que `rechazar_llamada` en la base: si sigue sonando y a esa
 * persona le suena, la marca «rechazada» y a quien llama le sale al momento.
 */
import { createClient } from "jsr:@supabase/supabase-js@2";
import { CORS, responderPreflight } from "../_compartido/cors.ts";
import { firmaValida } from "../_compartido/firmaDeLlamada.ts";

const json = (cuerpo: unknown, status: number) =>
  new Response(JSON.stringify(cuerpo), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });

Deno.serve(async (req: Request) => {
  const previo = responderPreflight(req);
  if (previo) return previo;
  if (req.method !== "POST") return json({ error: "Método no permitido" }, 405);

  let cuerpo: { llamadaId?: string; usuarioId?: string; firma?: string };
  try {
    cuerpo = await req.json();
  } catch {
    return json({ error: "Cuerpo inválido" }, 400);
  }
  const { llamadaId, usuarioId, firma } = cuerpo;
  if (!llamadaId || !usuarioId || !firma) return json({ error: "Faltan datos" }, 400);

  const secreto = Deno.env.get("LLAMADA_FIRMA_SECRETO");
  if (!secreto) return json({ error: "Falta el secreto LLAMADA_FIRMA_SECRETO" }, 500);
  if (!(await firmaValida(secreto, llamadaId, usuarioId, firma))) {
    return json({ error: "Firma no válida" }, 403);
  }

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });

  const { data, error } = await admin.rpc("rechazar_llamada_de", {
    p_llamada_id: llamadaId,
    p_usuario_id: usuarioId,
  });
  if (error) return json({ error: error.message }, 409);
  return json({ rechazada: Boolean(data) }, 200);
});
