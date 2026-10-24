/**
 * panel-usuarios · lo que el administrador de la app hace con una cuenta
 *
 * El panel de la plataforma (23/10/2026): «buscar y actuar». Buscar va por la
 * base (`panel_buscar_usuarios`); actuar necesita la API de administración de
 * Supabase, que solo se abre con la clave de servicio, así que vive aquí:
 *
 *   · bloquear      — la cuenta no puede entrar (`ban_duration`), hasta que se
 *                     desbloquee;
 *   · desbloquear;
 *   · enviar_contrasena — el correo para poner una contraseña nueva;
 *   · confirmar_correo  — para quien no recibió o no abrió el de confirmación.
 *   · suspender   — bloquea con un motivo, que queda en `suspension_cuenta`, le
 *                   llega por correo y la app le enseña; cierra sus sesiones
 *                   (24/10/2026);
 *   · reactivar   — levanta la suspensión y se lo dice por correo.
 *
 * Lo primero es comprobar, **con la sesión de quien llama**, que es dueño de
 * la plataforma (`es_dueno_plataforma`). La clave de servicio no se usa hasta
 * después. Y dos límites que la base no puede poner porque no ve `auth.users`:
 * nadie se bloquea a sí mismo, y no se bloquea a un dueño (dejaría la app sin
 * nadie que la opere; para quitar a un dueño está la pestaña Equipo).
 *
 * Nada de lo que hace toca la vida de la persona en sus edificios: ni sus
 * datos, ni sus membresías. Cada acción queda en la bitácora.
 */
import { createClient } from "jsr:@supabase/supabase-js@2";
import { CORS, responderPreflight } from "../_compartido/cors.ts";

const json = (cuerpo: unknown, status: number) =>
  new Response(JSON.stringify(cuerpo), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });

const ACCIONES = [
  "bloquear",
  "desbloquear",
  "enviar_contrasena",
  "confirmar_correo",
  "suspender",
  "reactivar",
] as const;
type Accion = (typeof ACCIONES)[number];

/** Cien años: Supabase no tiene «para siempre», y desbloquear lo deshace. */
const BLOQUEO_INDEFINIDO = "876000h";

Deno.serve(async (req: Request) => {
  const previo = responderPreflight(req);
  if (previo) return previo;
  if (req.method !== "POST") return json({ error: "Método no permitido" }, 405);

  const autorizacion = req.headers.get("Authorization");
  if (!autorizacion) return json({ error: "Falta la sesión" }, 401);

  let cuerpo: { accion?: string; usuarioId?: string; volverA?: string; motivo?: string };
  try {
    cuerpo = await req.json();
  } catch {
    return json({ error: "Cuerpo inválido" }, 400);
  }
  const accion = cuerpo.accion as Accion;
  if (!ACCIONES.includes(accion)) return json({ error: "Acción desconocida" }, 400);
  if (!cuerpo.usuarioId) return json({ error: "Falta la cuenta" }, 400);
  const motivo = cuerpo.motivo?.trim() ?? "";
  if (accion === "suspender" && (motivo.length < 3 || motivo.length > 500)) {
    return json({ error: "Escribe el motivo de la suspensión (entre 3 y 500 caracteres)" }, 400);
  }

  const url = Deno.env.get("SUPABASE_URL")!;
  const comoLaPersona = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: autorizacion } },
    auth: { persistSession: false },
  });

  const { data: quien } = await comoLaPersona.auth.getUser();
  if (!quien?.user) return json({ error: "Sesión no válida" }, 401);

  const { data: esDueno, error: errorRol } = await comoLaPersona.rpc("es_dueno_plataforma");
  if (errorRol) return json({ error: errorRol.message }, 500);
  if (esDueno !== true) {
    return json({ error: "Solo el dueño de la plataforma gestiona cuentas" }, 403);
  }

  const servicio = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });

  const { data: cuenta, error: errorCuenta } = await servicio.auth.admin.getUserById(cuerpo.usuarioId);
  if (errorCuenta || !cuenta?.user) return json({ error: "No existe esa cuenta" }, 404);
  const usuario = cuenta.user;

  if (accion === "bloquear" || accion === "suspender") {
    if (usuario.id === quien.user.id) {
      return json({ error: "No puedes bloquear tu propia cuenta" }, 409);
    }
    const { data: dueno } = await servicio
      .from("staff_plataforma")
      .select("id")
      .eq("usuario_id", usuario.id)
      .eq("activo", true)
      .eq("rol", "dueno")
      .maybeSingle();
    if (dueno) {
      return json({ error: "Es dueño de la plataforma: quítale el rol en Equipo antes de bloquearla" }, 409);
    }
  }

  let fallo: string | null = null;
  /** Si salió el correo al suspender o reactivar, y si no por qué. */
  let correo: { enviado: boolean; motivo?: string } | null = null;
  if (accion === "suspender" || accion === "reactivar") {
    const suspender = accion === "suspender";
    const { error } = await servicio.auth.admin.updateUserById(usuario.id, {
      ban_duration: suspender ? BLOQUEO_INDEFINIDO : "none",
    });
    fallo = error?.message ?? null;
    if (!fallo && suspender) {
      // Si ya había una vigente, se cambia el motivo: una sola por cuenta.
      const { data: vigente } = await servicio
        .from("suspension_cuenta")
        .select("id")
        .eq("usuario_id", usuario.id)
        .is("levantada_en", null)
        .maybeSingle();
      const { error: e } = vigente
        ? await servicio.from("suspension_cuenta").update({ motivo, suspendida_por: quien.user.id }).eq("id", vigente.id)
        : await servicio.from("suspension_cuenta").insert({ usuario_id: usuario.id, motivo, suspendida_por: quien.user.id });
      fallo = e?.message ?? null;
      // Fuera ya, sin esperar a que caduque la sesión que tuviera abierta.
      if (!fallo) await servicio.rpc("cerrar_sesiones_de", { p_usuario_id: usuario.id });
    }
    if (!fallo && !suspender) {
      const { error: e } = await servicio
        .from("suspension_cuenta")
        .update({ levantada_en: new Date().toISOString(), levantada_por: quien.user.id })
        .eq("usuario_id", usuario.id)
        .is("levantada_en", null);
      fallo = e?.message ?? null;
    }
    if (!fallo && usuario.email) {
      const { data: perfil } = await servicio.from("perfil").select("nombre").eq("id", usuario.id).maybeSingle();
      const { data: contacto } = await servicio.rpc("parametro", { p_clave: "soporte_correo", p_condominio_id: null });
      const respuesta = await fetch(`${url}/functions/v1/enviar-correo`, {
        method: "POST",
        // Con la sesión del dueño que pide: `enviar-correo` exige una sesión o
        // el token de servicio, y la clave de servicio de este entorno no es un
        // token (no trae rol que leer).
        headers: {
          Authorization: autorizacion,
          apikey: Deno.env.get("SUPABASE_ANON_KEY") ?? "",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tipo: suspender ? "cuenta-suspendida" : "cuenta-reactivada",
          correo: usuario.email,
          nombre: perfil?.nombre ?? "",
          motivo,
          contacto: typeof contacto === "string" && contacto.trim() ? contacto.trim() : undefined,
        }),
      });
      const datos = await respuesta.json().catch(() => ({}));
      correo = { enviado: Boolean(datos.enviado), motivo: datos.motivo ?? datos.error };
    }
  } else if (accion === "bloquear" || accion === "desbloquear") {
    const { error } = await servicio.auth.admin.updateUserById(usuario.id, {
      ban_duration: accion === "bloquear" ? BLOQUEO_INDEFINIDO : "none",
    });
    fallo = error?.message ?? null;
  } else if (accion === "confirmar_correo") {
    const { error } = await servicio.auth.admin.updateUserById(usuario.id, { email_confirm: true });
    fallo = error?.message ?? null;
  } else {
    if (!usuario.email) return json({ error: "La cuenta no tiene correo" }, 409);
    const { error } = await comoLaPersona.auth.resetPasswordForEmail(
      usuario.email,
      cuerpo.volverA ? { redirectTo: cuerpo.volverA } : undefined,
    );
    fallo = error?.message ?? null;
  }
  if (fallo) return json({ error: fallo }, 502);

  // Con la clave de servicio `auth.uid()` es nulo: el autor va explícito.
  const { error: errorBitacora } = await servicio.from("bitacora_plataforma").insert({
    actor_id: quien.user.id,
    accion: `cuenta_${accion}`,
    detalle: {
      usuario_id: usuario.id,
      correo: usuario.email,
      ...(accion === "suspender" ? { motivo } : {}),
    },
  });
  if (errorBitacora) console.error("bitácora:", errorBitacora.message);

  return json({ ok: true, correo }, 200);
});
