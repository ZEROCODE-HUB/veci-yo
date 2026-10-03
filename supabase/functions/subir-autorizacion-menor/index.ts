/**
 * subir-autorizacion-menor · el permiso de quien no es padre ni madre
 *
 * «Menores sin padre o madre siempre pedir documentacion del responsable pues!»
 * --el cliente, 02/10/2026--. Desde el 03/10 `cerrar_precheckin` lo exige, y
 * una regla que bloquea sin dar salida es peor que no tenerla: el titular no
 * podría terminar su preregistro nunca.
 *
 * Es hermana de `subir-documento-precheckin` y existe por el mismo motivo: el
 * bucket es privado, sus políticas derivan de quién puede ver la visita, y
 * quien hace el preregistro **no tiene sesión**. La única credencial que trae es
 * el enlace, y un enlace no es una sesión: hay que comprobarlo contra la base
 * antes de dejar escribir nada.
 *
 * Y es una función aparte, no un parámetro más de la otra, porque lo que guarda
 * es **otra cosa**: `verificacion_documento` son las dos caras de la cédula del
 * propio invitado, y esto es un papel firmado por otra persona. Mezclarlos
 * obligaría a la portería --que compara el documento físico contra esa fila-- a
 * adivinar cuál de los archivos está mirando.
 *
 * Lo que se comprueba, en este orden y antes de tocar el bucket:
 *
 *   · que el token exista --se compara su **hash**, nunca el token--;
 *   · que el preregistro no haya vencido ni esté cerrado;
 *   · que el invitado sea **de esa misma visita** y esté marcado como menor;
 *   · y que lo que llega sea un archivo de un tamaño razonable.
 */

import { CORS, responderPreflight } from "../_compartido/cors.ts";

/** Lo más grande que acepta: la foto de un papel, no un vídeo. */
const TOPE_BYTES = 8 * 1024 * 1024;

/*
  Un PDF también: una autorización notarial suele llegar escaneada así, y
  obligar a fotografiar un PDF para poder subirlo es ponerle un obstáculo a
  quien ya está haciendo lo que se le pide.
*/
const TIPOS = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
]);

const EXTENSION: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
};

interface Peticion {
  /** El token del enlace del preregistro, tal cual viene en la URL. */
  token: string;
  /** De qué menor es este permiso. */
  invitadoId: string;
  /** El archivo, en base64 y sin cabecera `data:`. */
  archivoBase64: string;
  contentType: string;
}

const json = (cuerpo: unknown, status: number) =>
  new Response(JSON.stringify(cuerpo), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });

const rechazo = (motivo: string, status = 400) => json({ error: motivo }, status);

async function sha256Hex(texto: string): Promise<string> {
  const datos = new TextEncoder().encode(texto);
  const resumen = await crypto.subtle.digest("SHA-256", datos);
  return Array.from(new Uint8Array(resumen))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function base(ruta: string, opciones: RequestInit = {}) {
  const url = Deno.env.get("SUPABASE_URL");
  const clave = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !clave) throw new Error("La función no está configurada");

  return fetch(`${url}${ruta}`, {
    ...opciones,
    headers: {
      apikey: clave,
      Authorization: `Bearer ${clave}`,
      "Content-Type": "application/json",
      ...(opciones.headers ?? {}),
    },
  });
}

Deno.serve(async (req: Request) => {
  /*
    Primero el `OPTIONS`. El navegador lo manda **antes** del POST --la petición
    lleva `Content-Type: application/json`-- y si se le responde «Método no
    permitido» la llamada muere ahí, con un `Failed to fetch` que no dice por
    qué. Es lo que tuvo rota esta función desde que se escribió.
  */

  const previo = responderPreflight(req);
  if (previo) return previo;

  if (req.method !== "POST") return rechazo("Método no permitido", 405);

  let cuerpo: Peticion;
  try {
    cuerpo = await req.json();
  } catch {
    return rechazo("Cuerpo inválido");
  }

  const { token, invitadoId, archivoBase64, contentType } = cuerpo ?? {};
  if (!token || !invitadoId || !archivoBase64 || !contentType) {
    return rechazo("Faltan campos: token, invitadoId, archivoBase64, contentType");
  }
  if (!TIPOS.has(contentType)) {
    return rechazo("La autorización tiene que ser una imagen jpg, png, webp o un PDF");
  }

  let binario: Uint8Array;
  try {
    binario = Uint8Array.from(atob(archivoBase64), (c) => c.charCodeAt(0));
  } catch {
    return rechazo("El archivo no se pudo leer");
  }
  if (binario.byteLength === 0) return rechazo("El archivo viene vacío");
  if (binario.byteLength > TOPE_BYTES) {
    return rechazo("El archivo pesa demasiado: el tope son 8 MB", 413);
  }

  const hash = await sha256Hex(token);
  const consulta = await base(
    `/rest/v1/visita?select=id,precheckin_expira_en,precheckin_completado_en` +
      `&precheckin_token_hash=eq.${hash}&limit=1`,
  );
  if (!consulta.ok) return json({ error: "No se pudo comprobar el enlace" }, 502);

  const [visita] = (await consulta.json()) as Array<{
    id: string;
    precheckin_expira_en: string | null;
    precheckin_completado_en: string | null;
  }>;

  // El mismo mensaje para «no existe» y «venció»: a quien no tiene el enlace
  // bueno no se le cuenta cuál de las dos cosas pasó.
  if (!visita) return rechazo("Este enlace no es válido o ya venció", 403);
  if (
    visita.precheckin_expira_en &&
    new Date(visita.precheckin_expira_en) <= new Date()
  ) {
    return rechazo("Este enlace no es válido o ya venció", 403);
  }
  if (visita.precheckin_completado_en) {
    return rechazo("Este preregistro ya está cerrado", 409);
  }

  /*
    Y que el menor sea de **esta** reserva. El uuid llega de fuera: sin este
    filtro, quien tuviera un enlace válido podría colgarle un papel a un niño de
    cualquier otra estancia.
  */
  const invitados = await base(
    `/rest/v1/invitado?select=id,es_menor,responsable_id,parentesco` +
      `&id=eq.${invitadoId}&visita_id=eq.${visita.id}&limit=1`,
  );
  if (!invitados.ok) return json({ error: "No se pudo comprobar el enlace" }, 502);

  const [menor] = (await invitados.json()) as Array<{
    id: string;
    es_menor: boolean;
    responsable_id: string | null;
    parentesco: string | null;
  }>;

  if (!menor) return rechazo("Esa persona no está en esta reserva", 403);
  if (!menor.es_menor) {
    return rechazo("Esta autorización es solo para menores de edad");
  }
  if (!menor.responsable_id) {
    return rechazo("Primero hay que decir quién responde por este menor", 409);
  }

  const ruta = `${visita.id}/autorizacion-${menor.id}.${EXTENSION[contentType]}`;

  const url = Deno.env.get("SUPABASE_URL");
  const clave = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const subida = await fetch(`${url}/storage/v1/object/visitas/${ruta}`, {
    method: "POST",
    headers: {
      apikey: clave,
      Authorization: `Bearer ${clave}`,
      "Content-Type": contentType,
      // Se puede repetir: alguien sube el papel equivocado y lo cambia.
      "x-upsert": "true",
    },
    body: binario,
  });
  if (!subida.ok) {
    return json({ error: "No se pudo guardar la autorización" }, 502);
  }

  /*
    Se copia **a nombre de quién** se firmó. Si después se cambia el responsable
    del menor, `cerrar_precheckin` ve que el papel que hay no corresponde al
    adulto que de verdad lo trae, y lo vuelve a pedir. Esa comparación es la
    única razón de que esta columna exista.
  */
  const fila = await base(`/rest/v1/autorizacion_menor?on_conflict=invitado_id`, {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify({
      invitado_id: menor.id,
      archivo_path: ruta,
      responsable_id: menor.responsable_id,
      parentesco: menor.parentesco,
    }),
  });
  if (!fila.ok) {
    return json({ error: "No se pudo guardar la autorización" }, 502);
  }

  return json({ guardado: true, ruta }, 200);
});
