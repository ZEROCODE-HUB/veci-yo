/**
 * vincular-administracion · el panel de la app le da un edificio a alguien
 *
 * Hasta el 29/10/2026 el primer administrador de un edificio recibía una
 * invitación y tenía que aceptarla. El cliente: «es mucha vaina». Ahora queda
 * vinculado en el acto y solo se le avisa por correo:
 *
 *   · si ya tiene cuenta, el correo le dice que ya administra el edificio;
 *   · si no, se le crea con el correo confirmado y el correo trae el enlace
 *     para poner su contraseña (uno solo, no dos correos).
 *
 * Lo primero es comprobar, **con la sesión de quien llama**, que es dueño de la
 * plataforma. Y se mantiene el límite de siempre: solo un edificio **sin
 * administración**. Sin eso, el dueño de la plataforma podría ponerse a sí
 * mismo, o a quien quisiera, de administración de un edificio con vecinos
 * dentro y leerlo todo.
 */
import { createClient } from "jsr:@supabase/supabase-js@2";
import { CORS, responderPreflight } from "../_compartido/cors.ts";
import { clienteRpcPorFetch, parametro } from "../_compartido/parametros.ts";

const json = (cuerpo: unknown, status: number) =>
  new Response(JSON.stringify(cuerpo), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });

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
  try {
    web = (await parametro(clienteRpcPorFetch(url, claveServicio), "url_web")).replace(/\/$/, "");
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }

  // La cuenta: la que ya tiene ese correo, o una nueva.
  const { data: existente, error: errorBusqueda } = await servicio.rpc("cuenta_por_correo", {
    p_correo: correo,
  });
  if (errorBusqueda) return json({ error: errorBusqueda.message }, 500);
  let usuarioId = (existente as string | null) ?? null;
  const cuentaNueva = !usuarioId;
  let enlace = web;

  if (cuentaNueva) {
    const { data: creada, error } = await servicio.auth.admin.createUser({
      email: correo,
      email_confirm: true,
      user_metadata: { nombre },
    });
    if (error || !creada?.user) return json({ error: error?.message ?? "No se pudo crear la cuenta" }, 502);
    usuarioId = creada.user.id;
    // El perfil lo inserta quien da de alta (no hay disparador que lo haga).
    const { error: errorPerfil } = await servicio
      .from("perfil")
      .upsert({ id: usuarioId, nombre }, { onConflict: "id", ignoreDuplicates: true });
    if (errorPerfil) return json({ error: errorPerfil.message }, 500);
    const { data: link, error: errorLink } = await servicio.auth.admin.generateLink({
      type: "recovery",
      email: correo,
      options: { redirectTo: `${web}/nueva-contrasena` },
    });
    if (errorLink || !link?.properties?.action_link) {
      return json({ error: errorLink?.message ?? "No se pudo generar el enlace de la contraseña" }, 502);
    }
    enlace = link.properties.action_link;
  }

  const { error: errorMembresia } = await servicio
    .from("membresia_condominio")
    .upsert(
      { condominio_id: edificio.id, usuario_id: usuarioId, rol: "administrador", nombre, activo: true },
      { onConflict: "condominio_id,usuario_id,rol" },
    );
  if (errorMembresia) return json({ error: errorMembresia.message }, 500);

  // Las invitaciones de administrador que quedaran vivas ya no hacen falta.
  await servicio
    .from("invitacion")
    .update({ estado: "revocada", updated_at: new Date().toISOString() })
    .eq("condominio_id", edificio.id)
    .eq("ambito", "condominio")
    .eq("rol_condominio", "administrador")
    .eq("estado", "pendiente");

  const { error: errorBitacora } = await servicio.from("bitacora_plataforma").insert({
    actor_id: quien.user.id,
    accion: "administracion_asignada",
    condominio_id: edificio.id,
    detalle: { correo, usuario_id: usuarioId, cuenta_nueva: cuentaNueva },
  });
  if (errorBitacora) console.error("bitácora:", errorBitacora.message);

  // El aviso. Si no sale, la vinculación ya está hecha: se dice, no se deshace.
  const respuesta = await fetch(`${url}/functions/v1/enviar-correo`, {
    method: "POST",
    headers: {
      Authorization: autorizacion,
      apikey: Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      tipo: "administracion-asignada",
      correo,
      nombre,
      condominio: edificio.nombre,
      enlace,
      cuentaNueva,
    }),
  });
  const datos = await respuesta.json().catch(() => ({}));
  const envio = { enviado: Boolean(datos.enviado), motivo: datos.enviado ? null : (datos.motivo ?? datos.error ?? null) };

  return json({ ok: true, usuarioId, cuentaNueva, correo: envio }, 200);
});
