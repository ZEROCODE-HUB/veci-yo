/**
 * enviar-invitacion · envío del correo de invitación
 *
 * ESTADO: contrato definido, transporte NO implementado.
 *
 * No hay proveedor de correo contratado. El documento de alcance del proyecto
 * menciona SendGrid, pero no existe ninguna clave en el proyecto de Supabase.
 * Mientras tanto la app no llama a esta función: `ENVIO_CORREO_ACTIVO` está en
 * false y el enlace se muestra en pantalla para poder recorrer el flujo.
 *
 * Para completarla:
 *   1. Guardar la clave del proveedor como secreto de la función:
 *      `supabase secrets set PROVEEDOR_EMAIL_API_KEY=...`
 *      Nunca como `EXPO_PUBLIC_*`: eso se empaqueta dentro de la app.
 *   2. Reemplazar `enviarCorreo()` por la llamada real al proveedor.
 *   3. Encender `EXPO_PUBLIC_INVITACIONES_EMAIL=true`.
 *   4. Quitar de `crearInvitacion()` la devolución del enlace a la UI.
 *
 * La función valida la petición y responde el contrato definitivo, así que el
 * día que se implemente el transporte no cambia nada del lado de la app.
 */

interface Peticion {
  invitacionId: string;
  correo: string;
  nombre: string;
  enlace: string;
}

function plantilla(nombre: string, enlace: string) {
  return {
    asunto: "Te invitaron a VeciYo",
    texto:
      `Hola ${nombre},\n\n` +
      `Te invitaron a unirte a tu edificio en VeciYo.\n\n` +
      `Para aceptar la invitación, entrá acá:\n${enlace}\n\n` +
      `El enlace vence en 14 días. Si no esperabas esta invitación, ignorá este mensaje.`,
  };
}

async function enviarCorreo(_destino: string, _asunto: string, _texto: string) {
  const clave = Deno.env.get("PROVEEDOR_EMAIL_API_KEY");
  if (!clave) {
    throw new Error(
      "PROVEEDOR_EMAIL_API_KEY no está configurada: el transporte de correo todavía no está implementado",
    );
  }
  // Aquí va la llamada al proveedor.
  throw new Error("Transporte de correo no implementado");
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Método no permitido" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  let cuerpo: Peticion;
  try {
    cuerpo = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Cuerpo inválido" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const faltantes = (["invitacionId", "correo", "nombre", "enlace"] as const)
    .filter((campo) => !cuerpo[campo]);

  if (faltantes.length > 0) {
    return new Response(
      JSON.stringify({ error: `Faltan campos: ${faltantes.join(", ")}` }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const { asunto, texto } = plantilla(cuerpo.nombre, cuerpo.enlace);

  try {
    await enviarCorreo(cuerpo.correo, asunto, texto);
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Error desconocido",
        invitacionId: cuerpo.invitacionId,
      }),
      { status: 501, headers: { "Content-Type": "application/json" } },
    );
  }

  return new Response(
    JSON.stringify({ enviado: true, invitacionId: cuerpo.invitacionId }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
});
