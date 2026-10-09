/**
 * subir-documento-precheckin · la foto del documento de quien todavía no tiene cuenta
 *
 * El preregistro pide una foto del documento, la pantalla avisa de que es
 * opcional, y **no iba a ninguna parte**: el bucket `visitas` es privado, sus
 * políticas derivan de quién puede ver la visita, y quien hace el preregistro
 * no tiene sesión --por definición: todavía no es nadie en el sistema--.
 *
 * Decidido el 25/09/2026 dejarlas opcionales para desbloquear la demo, con el
 * aviso puesto en la pantalla (REVISAR-A-OJO 31). Esto es lo que faltaba.
 *
 * ----------------------------------------------------------------------------
 * Por qué una función de servidor y no una política más
 * ----------------------------------------------------------------------------
 * Porque no hay a quién darle el permiso. Una política de Storage decide por
 * `auth.uid()`, y aquí no hay ninguno. La única credencial que trae esa persona
 * es **el enlace**, y un enlace no es una sesión: hay que comprobarlo contra la
 * base antes de dejar escribir nada, y eso solo se puede hacer con permisos de
 * servidor.
 *
 * Lo que se comprueba, en este orden y antes de tocar el bucket:
 *
 *   · que el token exista --se compara su **hash**, nunca el token--;
 *   · que el preregistro no haya vencido;
 *   · que no esté ya cerrado, porque entonces el documento ya se revisó;
 *   · y que lo que llega sea una imagen de un tamaño razonable.
 *
 * La clave de servicio vive como secreto de la función, nunca en la aplicación:
 * un `EXPO_PUBLIC_*` viaja dentro del paquete que se instala en el teléfono.
 */

import { CORS, responderPreflight } from "../_compartido/cors.ts";

/** Lo más grande que acepta: una foto de un documento, no un vídeo. */
const TOPE_BYTES = 8 * 1024 * 1024;

const TIPOS = new Set(["image/jpeg", "image/png", "image/webp"]);

interface Peticion {
  /** El token del enlace del preregistro, tal cual viene en la URL. */
  token: string;
  /** La foto, en base64 y sin cabecera `data:`. */
  imagenBase64: string;
  /** `image/jpeg`, `image/png` o `image/webp`. */
  contentType: string;
  /**
   * Cual de las dos caras. Por defecto el frente, que es la unica que tiene
   * todo documento: un pasaporte no tiene reverso con datos.
   */
  cara?: "frente" | "reverso";
}

const json = (cuerpo: unknown, status: number) =>
  new Response(JSON.stringify(cuerpo), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });

/** La respuesta de un fallo de validación: siempre la misma, sin detalles. */
const rechazo = (motivo: string, status = 400) => json({ error: motivo }, status);

async function sha256Hex(texto: string): Promise<string> {
  const datos = new TextEncoder().encode(texto);
  const resumen = await crypto.subtle.digest("SHA-256", datos);
  return Array.from(new Uint8Array(resumen))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Llama a PostgREST con la clave de servicio. */
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

  const {
    token,
    imagenBase64,
    contentType,
    cara = "frente",
    /*
      De quien es este documento. Sin el, el titular; con el, un invitado de
      **esta misma visita**.

      Hacia falta para los menores: un menor no tiene enlace propio --no puede
      aceptar terminos, asi que no se le emite-- y hasta el 09/10/2026 no habia
      ningun camino para subir su documento. El ministerio lo pide igual que el
      de un adulto: `loQueFalta` exige tipo y numero por cada persona.
    */
    invitadoId,
  } = cuerpo ?? {};
  if (cara !== "frente" && cara !== "reverso") {
    return rechazo("La cara del documento tiene que ser frente o reverso");
  }
  if (!token || !imagenBase64 || !contentType) {
    return rechazo("Faltan campos: token, imagenBase64, contentType");
  }
  if (!TIPOS.has(contentType)) {
    return rechazo("El documento tiene que ser una imagen jpg, png o webp");
  }

  let binario: Uint8Array;
  try {
    binario = Uint8Array.from(atob(imagenBase64), (c) => c.charCodeAt(0));
  } catch {
    return rechazo("La imagen no se pudo leer");
  }
  if (binario.byteLength === 0) return rechazo("La imagen viene vacía");
  if (binario.byteLength > TOPE_BYTES) {
    return rechazo("La imagen pesa demasiado: el tope son 8 MB", 413);
  }

  /*
    El enlace, comprobado contra la base. Se busca por el **hash**: el token en
    claro no está guardado en ningún sitio, que es lo que hace que robar la
    tabla no sirva para entrar.
  */
  const hash = await sha256Hex(token);
  type Visita = {
    id: string;
    precheckin_expira_en: string | null;
    precheckin_completado_en: string | null;
  };
  const camposVisita =
    "id,precheckin_expira_en,precheckin_completado_en";

  const consulta = await base(
    `/rest/v1/visita?select=${camposVisita}` +
      `&precheckin_token_hash=eq.${hash}&limit=1`,
  );
  if (!consulta.ok) return json({ error: "No se pudo comprobar el enlace" }, 502);

  let [visita] = (await consulta.json()) as Array<Visita>;

  /*
    Si no es el enlace de la estancia, puede ser el de un **acompañante**: los
    dos son tokens, pero el del titular vive en `visita` y el de cada
    acompañante en `invitado`. Desde el 09/10/2026 un acompañante puede traer
    a sus menores desde su propio enlace, y entonces es él quien sube la foto
    del documento del niño.

    Se busca en segundo lugar y no en paralelo a proposito: el caso normal
    sigue siendo el titular, y asi no se hacen dos consultas por cada subida.
  */
  if (!visita) {
    const porAcompanante = await base(
      `/rest/v1/invitado?select=visita:visita_id(${camposVisita})` +
        `&precheckin_token_hash=eq.${hash}&limit=1`,
    );
    if (!porAcompanante.ok) {
      return json({ error: "No se pudo comprobar el enlace" }, 502);
    }
    const [fila] = (await porAcompanante.json()) as Array<{ visita: Visita | null }>;
    if (fila?.visita) visita = fila.visita;
  }

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
    A quién pertenece el documento.

    Sin `invitadoId`, el titular: `invitado` tiene un índice único de titular
    por visita, así que es uno y solo uno.

    Con `invitadoId`, esa persona —**y se filtra por `visita_id`**, que es lo
    que impide que alguien con un enlace válido suba documentos a la visita de
    otro. El token dice de qué estancia se trata; el uuid solo dice a quién, y
    un uuid no es una credencial: esta pantalla ya aprendió eso una vez,
    cuando el enlace del acompañante era su uuid.
  */
  const filtro = invitadoId
    ? `id=eq.${encodeURIComponent(String(invitadoId))}`
    : `es_titular=is.true`;
  const invitados = await base(
    `/rest/v1/invitado?select=id&visita_id=eq.${visita.id}&${filtro}&limit=1`,
  );
  if (!invitados.ok) return json({ error: "No se pudo comprobar el enlace" }, 502);

  const [titular] = (await invitados.json()) as Array<{ id: string }>;
  if (!titular) {
    /*
      Dos casos con el mismo sintoma: un `invitadoId` que no es de esta visita
      --o inventado-- y una estancia sin titular, que no deberia existir pero
      ya reviento una vez con un 409. Se responde lo primero, que es lo unico
      que quien llama puede arreglar, y sin decir cual de los dos es: decirlo
      confirmaria si ese uuid existe en otra reserva.
    */
    return rechazo("Esa persona no está en esta reserva", 403);
  }

  /*
    La ruta empieza por el uuid de la visita, como las fotos de portería: de ahí
    derivan las políticas de Storage quién puede verla, que son los mismos que
    pueden ver la visita. La foto queda dentro del mismo círculo que el resto.
  */
  const extension = contentType.split("/")[1];
  const ruta = `${visita.id}/documento-${cara}-${titular.id}.${extension}`;

  const url = Deno.env.get("SUPABASE_URL");
  const clave = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const subida = await fetch(`${url}/storage/v1/object/visitas/${ruta}`, {
    method: "POST",
    headers: {
      apikey: clave,
      Authorization: `Bearer ${clave}`,
      "Content-Type": contentType,
      // Se puede repetir: alguien saca la foto, sale movida, y la repite.
      "x-upsert": "true",
    },
    body: binario,
  });
  if (!subida.ok) {
    return json({ error: "No se pudo guardar el documento" }, 502);
  }

  /*
    Y la constancia: la fila de verificación con la ruta, y el estado en
    `pendiente` --el documento está, nadie lo ha comparado todavía--. Eso es
    exactamente lo que la portería encuentra al abrir la visita.
  */
  const verificacion = await base(
    `/rest/v1/verificacion_documento?on_conflict=invitado_id`,
    {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=representation" },
      /*
        El frente y el reverso van a columnas distintas, y se suben por
        separado: quien hace el preregistro saca una foto, luego la otra, y
        cada una llega por su cuenta. Un `merge-duplicates` sobre
        `invitado_id` deja la fila con las dos sin que la segunda pise a la
        primera.
      */
      body: JSON.stringify({
        invitado_id: titular.id,
        estado: "pendiente",
        ...(cara === "frente"
          ? { documento_original_path: ruta }
          : { documento_reverso_path: ruta }),
      }),
    },
  );
  if (!verificacion.ok) {
    return json({ error: "No se pudo guardar el documento" }, 502);
  }

  return json({ guardado: true, ruta }, 200);
});
