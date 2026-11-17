/**
 * vincular-administracion · el panel de la app invita a la administración de
 * un edificio
 *
 * Historia, porque ha cambiado dos veces:
 *
 *   · Hasta el 29/10/2026 era una invitación que había que aceptar.
 *   · El 29/10/2026 (cliente: «es mucha vaina») pasó a vincular en el acto: si
 *     no tenía cuenta se le creaba y el correo traía el enlace de la **web**
 *     para poner su contraseña. La app no participaba.
 *   · El 16/11/2026 (cliente: «necesito que unifiquemos el tema de
 *     invitaciones para todos… se abre la app, le muestra la invitación y la
 *     app decide si debe crear cuenta o iniciar sesión») vuelve a ser una
 *     invitación, **igual que la del guardia**: el correo abre la app, la app
 *     dice «Iniciar sesión» o «Crear cuenta» según ese correo tenga cuenta, y
 *     se acepta con un toque. Ya no se crean cuentas sin contraseña ni se
 *     manda a la web.
 *
 * Lo primero es comprobar, **con la sesión de quien llama**, que es dueño de la
 * plataforma. Y se mantiene el límite de siempre: solo un edificio **sin
 * administración**. Sin eso, el dueño de la plataforma podría ponerse a sí
 * mismo, o a quien quisiera, de administración de un edificio con vecinos
 * dentro y leerlo todo.
 *
 * Volver a invitar a un edificio con una invitación pendiente la reemplaza: la
 * anterior se revoca y su enlace deja de valer.
 */
import { createClient } from "jsr:@supabase/supabase-js@2";
import { CORS, responderPreflight } from "../_compartido/cors.ts";
import { clienteRpcPorFetch, parametro, parametroEntero } from "../_compartido/parametros.ts";

const json = (cuerpo: unknown, status: number) =>
  new Response(JSON.stringify(cuerpo), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });

/** 32 bytes al azar en hexadecimal, como `crear_invitacion`. */
function tokenNuevo(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** El hash que se guarda: el token en claro solo viaja en el correo. */
async function sha256(texto: string): Promise<string> {
  const resumen = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(texto));
  return Array.from(new Uint8Array(resumen), (b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req: Request) => {
  const previo = responderPreflight(req);
  if (previo) return previo;
  if (req.method !== "POST") return json({ error: "Método no permitido" }, 405);

  const autorizacion = req.headers.get("Authorization");
  if (!autorizacion) return json({ error: "Falta la sesión" }, 401);

  let cuerpo: { condominioId?: string; correo?: string; nombre?: string };
  try {
    cuerpo = await req.json();
  } catch {
    return json({ error: "Cuerpo inválido" }, 400);
  }
  const correo = cuerpo.correo?.trim().toLowerCase() ?? "";
  const nombre = cuerpo.nombre?.trim() || "Administración";
  if (!cuerpo.condominioId) return json({ error: "Falta el edificio" }, 400);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(correo)) return json({ error: "Ese correo no sirve" }, 400);

  const url = Deno.env.get("SUPABASE_URL")!;
  const claveServicio = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const comoLaPersona = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: autorizacion } },
    auth: { persistSession: false },
  });
  const { data: quien } = await comoLaPersona.auth.getUser();
  if (!quien?.user) return json({ error: "Sesión no válida" }, 401);
  const { data: esDueno, error: errorRol } = await comoLaPersona.rpc("es_dueno_plataforma");
  if (errorRol) return json({ error: errorRol.message }, 500);
  if (esDueno !== true) {
    return json({ error: "Solo el dueño de la plataforma asigna la administración" }, 403);
  }

  const servicio = createClient(url, claveServicio, { auth: { persistSession: false } });

  const { data: edificio } = await servicio
    .from("condominio")
    .select("id, nombre")
    .eq("id", cuerpo.condominioId)
    .maybeSingle();
  if (!edificio) return json({ error: "Ese edificio no existe" }, 404);

  const { data: yaTiene } = await servicio
    .from("membresia_condominio")
    .select("id")
    .eq("condominio_id", edificio.id)
    .eq("activo", true)
    .in("rol", ["administrador", "coadministrador"])
    .limit(1);
  if (yaTiene?.length) {
    return json({ error: "Ese edificio ya tiene administración: pídesela a ella" }, 409);
  }

  let web: string;
  let dias: number;
  try {
    const rpc = clienteRpcPorFetch(url, claveServicio);
    web = (await parametro(rpc, "url_web")).replace(/\/$/, "");
    dias = await parametroEntero(rpc, "invitacion_admin_dias_validez");
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }

  // La invitación anterior a este edificio, si la hay, deja de valer.
  const { error: errorRevocar } = await servicio
    .from("invitacion")
    .update({ estado: "revocada", updated_at: new Date().toISOString() })
    .eq("condominio_id", edificio.id)
    .eq("ambito", "condominio")
    .eq("rol_condominio", "administrador")
    .eq("estado", "pendiente");
  if (errorRevocar) return json({ error: errorRevocar.message }, 500);

  const token = tokenNuevo();
  const { data: invitacion, error: errorInvitacion } = await servicio
    .from("invitacion")
    .insert({
      condominio_id: edificio.id,
      ambito: "condominio",
      rol_condominio: "administrador",
      correo,
      nombre,
      token_hash: await sha256(token),
      invitada_por: quien.user.id,
      expira_en: new Date(Date.now() + dias * 24 * 60 * 60 * 1000).toISOString(),
    })
    .select("id")
    .single();
  if (errorInvitacion || !invitacion) {
    return json({ error: errorInvitacion?.message ?? "No se pudo crear la invitación" }, 500);
  }

  const enlace = `${web}/invitacion?token=${token}`;

  const { error: errorBitacora } = await servicio.from("bitacora_plataforma").insert({
    actor_id: quien.user.id,
    accion: "administracion_invitada",
    condominio_id: edificio.id,
    detalle: { correo, invitacion_id: invitacion.id },
  });
  if (errorBitacora) console.error("bitácora:", errorBitacora.message);

  // El aviso. Si no sale, la invitación ya existe: se dice y se enseña el enlace.
  const respuesta = await fetch(`${url}/functions/v1/enviar-correo`, {
    method: "POST",
    headers: {
      Authorization: autorizacion,
      apikey: Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      tipo: "invitacion",
      rol: "administrador",
      correo,
      nombre,
      condominio: edificio.nombre,
      enlace,
    }),
  });
  const datos = await respuesta.json().catch(() => ({}));
  const enviado = Boolean(datos.enviado);
  if (enviado) {
    await servicio
      .from("invitacion")
      .update({ enviada_en: new Date().toISOString() })
      .eq("id", invitacion.id);
  }
  const envio = { enviado, motivo: enviado ? null : (datos.motivo ?? datos.error ?? null) };

  // Sin correo, el enlace vuelve al panel para poder pasarlo a mano.
  return json({ ok: true, invitacionId: invitacion.id, enlace: enviado ? null : enlace, correo: envio }, 200);
});
