/**
 * subir-documento-porteria · la foto que el guardia toma en la puerta
 *
 * Decidido con el cliente el 09/10/2026. Cuando llega un huésped, la portería
 * fotografía el documento que le enseñan. Esa foto:
 *
 *   · es **constancia**, no se compara con nada —«coincide» es número contra
 *     número, y eso lo decide `anotar_verificacion_en_porteria`—;
 *   · lleva una **marca de agua** con quién la tomó, en qué edificio y cuándo,
 *     para que no sirva fuera de aquí;
 *   · y no se queda en el teléfono del guardia: la aplicación la manda y la
 *     borra.
 *
 * ----------------------------------------------------------------------------
 * Por qué en el servidor
 * ----------------------------------------------------------------------------
 * Una marca que pone el teléfono es una marca que el teléfono puede no poner:
 * bastaría llamar al almacenamiento directamente para subir la foto limpia.
 * Aquí la imagen que se guarda es **la que sale de esta función**, y la que
 * llegó no se escribe en ningún sitio.
 *
 * Quién puede: se pregunta a la base con la sesión de quien llama
 * (`datos_para_foto_de_porteria`). Tiene que ser guardia de ese edificio y
 * tener a ese huésped en su lista —hoy, mañana o dentro—.
 */
import { createClient } from "jsr:@supabase/supabase-js@2";
import { decode, Image } from "https://deno.land/x/imagescript@1.2.17/mod.ts";
import { CORS, responderPreflight } from "../_compartido/cors.ts";
import { textoEnPuntos } from "../_compartido/letras.ts";

/** Lo más grande que acepta: una foto de un documento, no un vídeo. */
const TOPE_BYTES = 8 * 1024 * 1024;
/** El lado más largo de lo que se guarda. De sobra para leer un documento. */
const LADO_MAXIMO = 1600;

const json = (cuerpo: unknown, status: number) =>
  new Response(JSON.stringify(cuerpo), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });

/** `dd/MM/yyyy HH:mm` con el reloj del edificio, no con el del servidor. */
function fechaDelEdificio(zona: string): string {
  const partes = new Intl.DateTimeFormat("es-CO", {
    timeZone: zona,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const de = (tipo: string) => partes.find((p) => p.type === tipo)?.value ?? "";
  return `${de("day")}/${de("month")}/${de("year")} ${de("hour")}:${de("minute")}`;
}

/** El texto, pintado a puntos en una imagen transparente. */
function sello(texto: string, punto: number): Image {
  const { ancho, alto, puntos } = textoEnPuntos(texto);
  // Un punto de margen para la sombra, que es lo que la hace legible sobre
  // un documento blanco igual que sobre uno oscuro.
  const imagen = new Image((ancho + 1) * punto, (alto + 1) * punto);
  const sombra = Image.rgbaToColor(0, 0, 0, 140);
  const tinta = Image.rgbaToColor(255, 255, 255, 185);
  const mitad = Math.max(1, Math.floor(punto / 2));

  for (const [color, corrido] of [[sombra, mitad], [tinta, 0]] as const) {
    for (let y = 0; y < alto; y++) {
      for (let x = 0; x < ancho; x++) {
        if (!puntos[y][x]) continue;
        imagen.drawBox(x * punto + 1 + corrido, y * punto + 1 + corrido, punto, punto, color);
      }
    }
  }
  return imagen;
}

/** La foto, reducida y con la marca repetida en diagonal. */
async function estampar(binario: Uint8Array, lineas: string[]): Promise<Uint8Array> {
  const decodificada = await decode(binario);
  if (!(decodificada instanceof Image)) throw new Error("no es una imagen fija");
  const foto = decodificada;

  const largo = Math.max(foto.width, foto.height);
  if (largo > LADO_MAXIMO) {
    const escala = LADO_MAXIMO / largo;
    foto.resize(Math.round(foto.width * escala), Math.round(foto.height * escala));
  }

  // La línea más larga ocupa algo más de la mitad del ancho.
  const masLarga = lineas.reduce((a, b) => (b.length > a.length ? b : a), "");
  const punto = Math.max(2, Math.floor((foto.width * 0.55) / (textoEnPuntos(masLarga).ancho + 1)));

  const sellos = lineas.map((l) => sello(l, punto));
  const anchoBloque = Math.max(...sellos.map((s) => s.width));
  const altoLinea = sellos[0].height + punto * 3;
  const altoBloque = altoLinea * sellos.length;
  /*
    En un lienzo cuadrado del tamaño de la diagonal: al girar un rectangulo
    dentro de su propio marco las esquinas se salen, y la primera version
    dejaba «PORTERIA» cortada por los dos lados. Se vio mirando la foto.
  */
  const lado = Math.ceil(Math.hypot(anchoBloque, altoBloque));
  const bloque = new Image(lado, lado);
  const arriba = Math.floor((lado - altoBloque) / 2);
  sellos.forEach((s, i) =>
    bloque.composite(s, Math.floor((lado - s.width) / 2), arriba + i * altoLinea),
  );
  bloque.rotate(24, false);

  /*
    Repetida y no una sola en una esquina: una marca en una esquina se recorta.
    Tres filas al tresbolillo cubren el documento esté donde esté en la foto.
  */
  const pasoY = Math.floor(foto.height / 3);
  for (let fila = 0; fila < 3; fila++) {
    const y = fila * pasoY + Math.floor((pasoY - bloque.height) / 2);
    const x = Math.floor((foto.width - bloque.width) / 2) + (fila % 2 === 0 ? -punto * 6 : punto * 6);
    foto.composite(bloque, x, y);
  }

  return foto.encodeJPEG(82);
}

Deno.serve(async (req: Request) => {
  // El `OPTIONS` primero: la aplicación corre en el navegador y pregunta antes.
  const previo = responderPreflight(req);
  if (previo) return previo;

  if (req.method !== "POST") return json({ error: "Método no permitido" }, 405);

  const autorizacion = req.headers.get("Authorization");
  if (!autorizacion) return json({ error: "Falta la sesión" }, 401);

  let peticion: { invitadoId?: string; imagenBase64?: string };
  try {
    peticion = await req.json();
  } catch {
    return json({ error: "Cuerpo inválido" }, 400);
  }
  const { invitadoId, imagenBase64 } = peticion ?? {};
  if (!invitadoId || !imagenBase64) {
    return json({ error: "Faltan campos: invitadoId, imagenBase64" }, 400);
  }

  let binario: Uint8Array;
  try {
    binario = Uint8Array.from(atob(imagenBase64), (c) => c.charCodeAt(0));
  } catch {
    return json({ error: "La imagen no se pudo leer" }, 400);
  }
  if (binario.byteLength === 0) return json({ error: "La imagen viene vacía" }, 400);
  if (binario.byteLength > TOPE_BYTES) {
    return json({ error: "La imagen pesa demasiado: el tope son 8 MB" }, 413);
  }

  const url = Deno.env.get("SUPABASE_URL")!;
  const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
  const claveServicio = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // Con la sesión de quien llama: es la base la que dice si es guardia y si
  // tiene a esta persona en su lista.
  const comoLaPersona = createClient(url, anon, {
    global: { headers: { Authorization: autorizacion } },
    auth: { persistSession: false },
  });
  const { data: datos, error: errorDatos } = await comoLaPersona.rpc(
    "datos_para_foto_de_porteria",
    { p_invitado_id: invitadoId },
  );
  if (errorDatos) return json({ error: errorDatos.message }, 403);
  const contexto = (datos ?? [])[0] as
    | { visita_id: string; guardia: string | null; condominio: string; zona_horaria: string }
    | undefined;
  if (!contexto) return json({ error: "Esa persona no está en la lista de la portería" }, 403);

  let estampada: Uint8Array;
  try {
    estampada = await estampar(binario, [
      `PORTERIA ${contexto.condominio}`,
      contexto.guardia ?? "GUARDIA",
      fechaDelEdificio(contexto.zona_horaria),
    ]);
  } catch {
    return json({ error: "La foto no se pudo procesar. Tómala de nuevo." }, 400);
  }

  /*
    La ruta empieza por el uuid de la visita, como todo lo de este bucket: de
    ahí derivan las políticas quién puede verla. El nombre empieza por
    `porteria-`, que es lo que la distingue de la que subió el huésped
    (`documento-`), que la portería no puede abrir.
  */
  const ruta = `${contexto.visita_id}/porteria-${invitadoId}-${Date.now()}.jpg`;
  const servicio = createClient(url, claveServicio, { auth: { persistSession: false } });

  const { error: errorSubida } = await servicio.storage
    .from("visitas")
    .upload(ruta, estampada, { contentType: "image/jpeg" });
  if (errorSubida) return json({ error: "No se pudo guardar la foto" }, 502);

  /*
    Y la constancia. No toca `estado`: tomar la foto no es verificar, y quien
    ya estaba verificado sigue estándolo.
  */
  const { data: previa } = await servicio
    .from("verificacion_documento")
    .select("id")
    .eq("invitado_id", invitadoId)
    .maybeSingle();

  const { error: errorFila } = previa
    ? await servicio
        .from("verificacion_documento")
        .update({ documento_tomado_path: ruta })
        .eq("id", previa.id)
    : await servicio
        .from("verificacion_documento")
        .insert({ invitado_id: invitadoId, documento_tomado_path: ruta });

  if (errorFila) {
    // Sin la fila nadie encontraría la foto: mejor no dejarla suelta.
    await servicio.storage.from("visitas").remove([ruta]);
    return json({ error: "No se pudo anotar la foto" }, 502);
  }

  return json({ ruta }, 200);
});
