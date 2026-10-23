/**
 * enviar-correo · los correos que el producto manda fuera de la aplicación
 *
 * Sustituye a `enviar-invitacion`, que tenía el contrato definido, el nombre de
 * un solo caso y **el transporte sin implementar**: fallaba con un 501 a
 * propósito y la aplicación no la llamaba.
 *
 * Aquí están las seis plantillas y el transporte montado. Lo único que falta
 * para que salgan correos de verdad son **las credenciales**, que se ponen
 * como secretos y no tocan ni una línea de código:
 *
 *   supabase secrets set SMTP_CLAVE=re_... SMTP_DESDE="Veciyo <hola@tudominio>"
 *
 * Siguen llamándose `SMTP_*` aunque desde el 07/10/2026 esto hable con la API
 * de Resend y no con un servidor SMTP: en Resend la contraseña de SMTP **es**
 * la clave de la API, así que el secreto que ya estaba puesto vale igual.
 * Renombrarlos obligaría a volver a teclearlos sin ganar nada. El motivo del
 * cambio está escrito donde se manda, más abajo.
 *
 * Sin ellas responde **200 y `enviado: false`**, no un error: la aplicación ya
 * enseña el enlace en pantalla cuando el correo está apagado, y romper la
 * invitación entera porque no haya correo sería peor que no enviarla.
 *
 * ----------------------------------------------------------------------------
 * Los seis, y por qué solo seis
 * ----------------------------------------------------------------------------
 * Son los que van a alguien que **todavía no tiene la aplicación**: ahí el
 * correo es el único canal que hay. Lo demás --paquete recibido, reserva
 * aprobada, reconocimiento-- ya viaja como notificación dentro de la
 * aplicación, a gente que la tiene instalada, y duplicarlo por correo es una
 * decisión de producto que nadie ha tomado.
 *
 * Los de la cuenta --recuperar la contraseña, confirmar el correo-- no pasan
 * por aquí: los manda Supabase Auth con sus propias plantillas, que están en
 * `supabase/correos/` y se suben con
 * `supabase/herramientas/subir-plantillas-de-correo.mjs`.
 *
 * ----------------------------------------------------------------------------
 * Cada correo se escribe una vez
 * ----------------------------------------------------------------------------
 * Estos seis salían **solo en texto plano**, con la firma compuesta a mano en
 * cada caso. El 06/10/2026 el cliente recibió los primeros correos de verdad y
 * dijo que se veían básicos: tenía razón, y lo mismo pasaba con los de Supabase
 * Auth, que encima estaban en inglés.
 *
 * Ahora cada uno se describe una sola vez --título, párrafos, botón, nota-- y
 * `maqueta-correo.mjs` saca de ahí **las dos versiones**: la HTML con la marca
 * y la de texto plano, que es la que ven los clientes que no pintan HTML y la
 * que mira buena parte del filtro de spam. Un correo con HTML y sin texto se
 * marca como sospechoso.
 *
 * La maqueta es la **misma** que usan las plantillas de Supabase Auth, a
 * propósito: si cada camino trae la suya, el día que una cambie el producto
 * mandará dos correos que no se parecen. Ya pasó con el rango de horas de un
 * turno, que un sitio escribía con guion y otro con «a».
 */
import { CORS, responderPreflight } from "../_compartido/cors.ts";
import { componer } from "../_compartido/maqueta-correo.mjs";
import QRCode from "npm:qrcode@1.5.4";
import type { Correo } from "../_compartido/maqueta-correo.d.mts";
import { clienteRpcPorFetch, parametroEntero } from "../_compartido/parametros.ts";

type Tipo =
  | "invitacion"
  | "precheckin"
  | "acceso-huesped"
  | "acceso-acompanante"
  | "recordatorio-huesped"
  | "recordatorio-anfitrion"
  | "ingreso-aprobado";

interface Peticion {
  tipo: Tipo;
  /** A quién va. */
  correo: string;
  /** Su nombre de pila, para que el correo no empiece con «Hola,». */
  nombre?: string;
  /** El enlace, que es lo único que de verdad lleva cada uno de estos correos. */
  enlace: string;
  /** El edificio, cuando se sabe: ayuda a reconocer de qué va esto. */
  condominio?: string;
  /** De quién viene, para las invitaciones y el preregistro. */
  deParte?: string;
  /**
   * Cuántos días faltan para la llegada. Solo en los recordatorios, y es lo
   * único que los distingue entre sí: «quedan 7 días» y «es mañana» tienen que
   * sonar distinto o el tercero se ignora como los dos anteriores.
   */
  diasAntes?: number;
  /** El resumen de la reserva en el correo de ingreso aprobado. */
  unidad?: string;
  desde?: string;
  hasta?: string;
}

/** Un adjunto que el correo pinta dentro con `cid:`. */
interface Adjunto {
  filename: string;
  content: string;
  content_id: string;
}

/** dd/MM/yyyy desde `yyyy-MM-dd`, sin pasar por la zona del servidor. */
const fechaCorta = (iso?: string) =>
  iso && /^\d{4}-\d{2}-\d{2}/.test(iso)
    ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`
    : "";

const json = (cuerpo: unknown, status: number) =>
  new Response(JSON.stringify(cuerpo), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });

/**
 * Las seis plantillas.
 *
 * Las seis dicen **qué es, quién lo manda y qué pasa si no era para ti**. Lo
 * último no es cortesía: un enlace de acceso a la casa de alguien que llega al
 * buzón equivocado tiene que poder ignorarse con confianza, y por eso el pie
 * por defecto de la maqueta lo dice en todos.
 */
function plantilla(
  p: Peticion,
  /** Cuánto dura el enlace de una invitación; solo lo usa «invitacion». */
  diasValidezInvitacion?: number,
): Correo & { asunto: string } {
  const saludo = p.nombre?.trim() ? `Hola ${p.nombre.trim()},` : "Hola,";
  /*
    Las piezas que pueden faltar. Se arman aqui con su preposicion para que la
    frase siga teniendo sentido cuando no vienen: «tu vivienda de Las
    Barranqueras» y «tu vivienda», no «tu vivienda de».
  */
  const donde = p.condominio ? ` de ${p.condominio}` : "";
  const enDonde = p.condominio ? ` en ${p.condominio}` : "";
  const dePartede = p.deParte ? ` por ${p.deParte}` : "";
  const quienReservo = p.deParte ? `${p.deParte} hizo` : "alguien hizo";

  switch (p.tipo) {
    case "invitacion":
      return {
        asunto: "Te invitaron a tu edificio en Veciyo",
        titulo: "Te invitaron a tu edificio",
        saludo,
        parrafos: [
          `Te invitaron${dePartede} a unirte a tu vivienda${donde} en Veciyo, ` +
            `la aplicación con la que el edificio se organiza: visitas, ` +
            `correspondencia, zonas comunes y avisos.`,
        ],
        boton: { texto: "Aceptar la invitación", url: p.enlace },
        // El plazo sale del parámetro `invitacion_dias_validez`, el mismo que
        // usa `crear_invitacion`: hasta el 18/10/2026 aquí ponía «7» a mano y
        // si se cambiaba el plazo en la base el correo seguía diciendo 7.
        nota: `El enlace vence en ${cuantoFalta(diasValidezInvitacion)}.`,
      };

    case "precheckin":
      return {
        asunto: "Completa tu registro antes de llegar",
        titulo: "Completa tu registro antes de llegar",
        saludo,
        parrafos: [
          `Ya está lista tu estancia${enDonde}. Antes de llegar necesitamos ` +
            `tus datos y los de quienes vienen contigo: es lo que la portería ` +
            `comprueba en la puerta.`,
          "Son unos minutos.",
        ],
        boton: { texto: "Completar mi registro", url: p.enlace },
        nota: "Hazlo antes de viajar. Si llegas sin este paso, la entrada tarda más.",
      };

    case "acceso-huesped":
      return {
        asunto: `Tu acceso a ${p.condominio ?? "tu alojamiento"}`,
        titulo: "Tu acceso está listo",
        saludo,
        parrafos: [
          `Tu registro quedó completo. Con este enlace entras a la ` +
            `aplicación, donde tienes las instrucciones de llegada, la clave ` +
            `del wifi, las zonas comunes y el chat con la portería.`,
        ],
        boton: { texto: "Entrar a mi alojamiento", url: p.enlace },
        nota:
          "Guárdalo: es tu llave, y se abre una sola vez. Si lo pierdes, " +
          "pídele a tu anfitrión que te lo vuelva a enviar.",
      };

    case "acceso-acompanante":
      return {
        asunto: "Completa tus datos para la estancia",
        titulo: "Completa tus datos",
        saludo,
        parrafos: [
          `Vas a alojarte${enDonde}, en la reserva que ${quienReservo}. La ` +
            `portería necesita tus datos para dejarte entrar, y solo los ` +
            `puedes poner tú.`,
        ],
        boton: { texto: "Poner mis datos", url: p.enlace },
        nota:
          "Si prefieres que los ponga quien hizo la reserva, dile y lo hace " +
          "por ti; entonces puedes ignorar este correo.",
      };

    /*
      Los dos recordatorios. Lo que de verdad cambia entre el primero y el
      último es la urgencia: tres correos iguales se ignoran igual, así que la
      cuenta atrás va en el asunto, en el título y en la primera frase.
    */
    case "recordatorio-huesped":
      return {
        asunto:
          p.diasAntes === 1
            ? "Mañana llegas y te falta el registro"
            : `Te faltan ${cuantoFalta(p.diasAntes)} para llegar y el registro sigue sin terminar`,
        titulo:
          p.diasAntes === 1
            ? "Mañana llegas y te falta el registro"
            : `Te faltan ${cuantoFalta(p.diasAntes)} y el registro sigue a medias`,
        saludo,
        parrafos: [
          p.diasAntes === 1
            ? `Mañana es tu entrada${enDonde} y tu registro todavía no está completo.`
            : `Tu entrada${enDonde} es en ${cuantoFalta(p.diasAntes)} y tu registro todavía no está completo.`,
          "Sin él, la portería no tiene tus datos y la entrada se demora: hay " +
            "que hacerlo todo en la puerta, con tus documentos en la mano.",
        ],
        boton: { texto: "Terminar mi registro", url: p.enlace },
        // Y esto no es un detalle: si alguien tenía el anterior a medias, se
        // le acaba de caer. Mejor decirlo que dejarle descubrirlo.
        nota: "Este enlace reemplaza a cualquiera que te hayamos mandado antes.",
      };

    /*
      Cuando todo el grupo terminó y no queda nada por aprobar (16/10/2026).
      Lo promete la última pantalla del preregistro. El enlace lleva a la web,
      que pinta el QR; el código va escrito también, por si no carga.
    */
    case "ingreso-aprobado": {
      /*
        El mismo texto que la página del QR (QA 23/10/2026), con el QR dentro
        del correo y el resumen de la reserva.
      */
      const desde = fechaCorta(p.desde);
      const hasta = fechaCorta(p.hasta);
      const resumen = [
        p.condominio ? `${p.condominio}${p.unidad ? `, vivienda ${p.unidad}` : ""}` : "",
        desde && hasta ? `del ${desde} al ${hasta}` : "",
      ]
        .filter(Boolean)
        .join(", ");
      return {
        asunto: `Tu ingreso a ${p.condominio ?? "tu alojamiento"} está aprobado`,
        titulo: "Tu ingreso está aprobado",
        saludo,
        parrafos: [
          `El equipo de seguridad y tu anfitrión revisaron el registro de todo ` +
            `tu grupo, y tu ingreso${enDonde} está aprobado.`,
          ...(resumen ? [`Tu reserva: ${resumen}.`] : []),
          "Este es tu QR de ingreso. Muéstralo en recepción al llegar para " +
            "agilizar tu registro físico. Lleva tus documentos: el equipo de " +
            "seguridad los compara con lo que registraste.",
        ],
        imagen: { cid: "qr-ingreso", alt: "Tu QR de ingreso", ancho: 220 },
        codigo: p.enlace.split("/").pop(),
        boton: { texto: "Abrir mi QR", url: p.enlace },
        nota: "El QR solo sirve para encontrar tu reserva en recepción; no abre ninguna puerta.",
      };
    }

    case "recordatorio-anfitrion":
      return {
        asunto:
          p.diasAntes === 1
            ? `${p.deParte ?? "Tu huésped"} llega mañana sin registrarse`
            : `A ${p.deParte ?? "tu huésped"} le falta el registro`,
        titulo:
          p.diasAntes === 1
            ? `${p.deParte ?? "Tu huésped"} llega mañana sin registrarse`
            : `A ${p.deParte ?? "tu huésped"} le falta el registro`,
        saludo,
        parrafos: [
          `${p.deParte ?? "Tu huésped"} llega ${
            p.diasAntes === 1 ? "mañana" : `en ${cuantoFalta(p.diasAntes)}`
          }${enDonde} y todavía no ha terminado su preregistro.`,
          "Si no lo hace, la portería tendrá que tomarle los datos en la " +
            "puerta, con los documentos de todos los que vengan.",
        ],
        // Deliberadamente sin el enlace del huésped: el de él no se puede
        // recuperar, y emitirle uno nuevo desde aquí anularía el que acabamos
        // de mandarle a él. Desde la reserva se lo reenvía quien quiera.
        boton: { texto: "Ver la reserva en Veciyo", url: p.enlace },
      };
  }
}

/** «7 días», «1 día». Sin esto salía «1 días» en el último recordatorio. */
function cuantoFalta(dias?: number): string {
  if (!dias || dias < 1) return "muy poco";
  return dias === 1 ? "1 día" : `${dias} días`;
}

/**
 * Lo que hace falta para mandar un correo.
 *
 * `SMTP_CLAVE` y `SMTP_DESDE` siguen llamándose así aunque esto ya no hable
 * SMTP: **en Resend la contraseña de SMTP es la propia clave de la API**, así
 * que el secreto que ya estaba puesto vale tal cual y no hay que volver a
 * teclear nada. `RESEND_API_KEY` tiene preferencia por si algún día se
 * separan.
 */
function credenciales() {
  const clave = Deno.env.get("RESEND_API_KEY") ?? Deno.env.get("SMTP_CLAVE");
  const desde = Deno.env.get("CORREO_DESDE") ?? Deno.env.get("SMTP_DESDE");
  if (!clave || !desde) return null;
  return { clave, desde };
}

/**
 * ----------------------------------------------------------------------------
 * Por qué esto ya no es SMTP
 * ----------------------------------------------------------------------------
 * El cliente lo vio el 07/10/2026: «en algunos correos algunos caracteres se
 * muestran con un símbolo raro, quizá sean acentos». Tenía razón, y era **solo
 * el asunto**.
 *
 * `denomailer` codifica las cabeceras con `quotedPrintableEncodeInline`, que
 * envuelve el texto en una «encoded-word» de la RFC 2047 --`=?utf-8?Q?...?=`--
 * y **deja los espacios en claro dentro**. La RFC dice que un espacio termina
 * la palabra codificada, así que «Cambia tu contraseña de Veciyo» sale como
 *
 *     =?utf-8?Q?Cambia tu contrase=c3=b1a de Veciyo?=
 *
 * y lo que se lee en la bandeja es eso mismo, o «contrase=c3=b1a», según lo
 * tolerante que sea el cliente de correo. Un asunto sin acentos llega bien, y
 * por eso fallaban **algunos** correos y no todos.
 *
 * Reproducido antes de tocar nada: se copió el codificador de la librería a un
 * script, se le dieron nuestros asuntos y se descodificaron como lo haría un
 * cliente. Cinco de seis llegan mal. El **cuerpo** --HTML y texto-- va por
 * otro camino y da la vuelta idéntico, así que no era eso.
 *
 * El fallo sigue en la última versión de la librería. Y todas las salidas por
 * dentro de ella dependen de un detalle de su implementación --colar el asunto
 * ya codificado aprovechando que solo re-codifica lo que empieza por `=?`, o
 * mandar una cabecera `Subject` duplicada--. Un arreglo que depende de cómo
 * esté escrita otra capa no es un arreglo: es una bomba para la siguiente
 * actualización.
 *
 * Así que se manda por la API de Resend, que recibe el asunto como un campo
 * JSON y arma el MIME ella. Se pierde el ser agnóstico del proveedor, y es un
 * precio consciente: el producto ya manda **todo** por Resend --los correos de
 * la cuenta también-- y lo que se gana es que el castellano se pueda escribir
 * con acentos. Si algún día se cambia de proveedor, este es el único archivo
 * que hay que tocar.
 */
async function enviar(
  destino: string,
  asunto: string,
  texto: string,
  html: string,
  adjuntos: Adjunto[] = [],
) {
  const c = credenciales()!;

  const respuesta = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${c.clave}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: c.desde,
      to: [destino],
      subject: asunto,
      // Las dos versiones: la maquetada y la de texto, que es la que ven los
      // clientes que no pintan HTML y la que mira el filtro de spam.
      html,
      text: texto,
      ...(adjuntos.length ? { attachments: adjuntos } : {}),
    }),
  });

  if (!respuesta.ok) {
    // El motivo, no un «no se pudo enviar»: aquí vienen los errores que de
    // verdad pasan --dominio sin verificar, clave caducada, destinatario
    // rechazado-- y sin ellos hay que adivinar.
    throw new Error(`Resend respondió ${respuesta.status}: ${await respuesta.text()}`);
  }
}

/**
 * El QR del ingreso aprobado, como PNG adjunto. Lo que codifica es lo mismo
 * que pinta la página `/qr/:codigo` de la web: el código en mayúsculas.
 */
async function adjuntosDe(p: Peticion, correo: Correo): Promise<Adjunto[]> {
  if (p.tipo !== "ingreso-aprobado" || !correo.imagen || !correo.codigo) return [];
  const dataUrl: string = await QRCode.toDataURL(correo.codigo.toUpperCase(), {
    width: 440,
    margin: 2,
  });
  return [
    {
      filename: "qr-ingreso.png",
      content: dataUrl.replace(/^data:image\/png;base64,/, ""),
      content_id: correo.imagen.cid,
    },
  ];
}

Deno.serve(async (req: Request) => {
  /*
    El `OPTIONS` primero. La aplicacion corre hoy **en el navegador**, y
    `functions.invoke` manda `authorization` y `content-type`, asi que el
    navegador pregunta antes de llamar. Sin esto la respuesta es 405 sin
    cabeceras y lo que llega al codigo es `Failed to fetch`.

    Los recorridos no lo veian porque corren en Node, donde no hay preflight.
  */
  const previo = responderPreflight(req);
  if (previo) return previo;

  if (req.method !== "POST") return json({ error: "Método no permitido" }, 405);

  let cuerpo: Peticion;
  try {
    cuerpo = await req.json();
  } catch {
    return json({ error: "Cuerpo inválido" }, 400);
  }

  const tipos: Tipo[] = [
    "invitacion",
    "precheckin",
    "acceso-huesped",
    "acceso-acompanante",
    "recordatorio-huesped",
    "recordatorio-anfitrion",
    "ingreso-aprobado",
  ];
  if (!cuerpo?.tipo || !tipos.includes(cuerpo.tipo)) {
    return json({ error: `El tipo tiene que ser uno de: ${tipos.join(", ")}` }, 400);
  }
  if (!cuerpo.correo || !cuerpo.enlace) {
    return json({ error: "Faltan campos: correo, enlace" }, 400);
  }

  /*
    El plazo de la invitación se lee de la base solo cuando hace falta: los
    demás correos no lo nombran y no tienen por qué esperar a una consulta.
    Si no se puede leer, el correo no sale con un plazo inventado.
  */
  let diasValidezInvitacion: number | undefined;
  if (cuerpo.tipo === "invitacion") {
    const url = Deno.env.get("SUPABASE_URL");
    const claveServicio = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !claveServicio) {
      return json({ error: "La función no está configurada" }, 500);
    }
    try {
      diasValidezInvitacion = await parametroEntero(
        clienteRpcPorFetch(url, claveServicio),
        "invitacion_dias_validez",
      );
    } catch (error) {
      return json(
        { error: error instanceof Error ? error.message : "No se pudo leer el plazo" },
        502,
      );
    }
  }

  const { asunto, ...descripcion } = plantilla(cuerpo, diasValidezInvitacion);
  const { texto, html } = componer(descripcion);

  /*
    Sin credenciales se responde que **no se envió**, y con la plantilla dentro.
    Así la aplicación puede seguir --ya enseña el enlace en pantalla cuando el
    correo está apagado-- y además se puede ver qué se habría mandado sin tener
    que desplegar nada.
  */
  if (!credenciales()) {
    return json(
      {
        enviado: false,
        motivo: "El servidor de correo no está configurado",
        asunto,
        texto,
        html,
      },
      200,
    );
  }

  try {
    await enviar(cuerpo.correo, asunto, texto, html, await adjuntosDe(cuerpo, descripcion));
  } catch (error) {
    return json(
      {
        enviado: false,
        error: error instanceof Error ? error.message : "No se pudo enviar",
      },
      502,
    );
  }

  return json({ enviado: true }, 200);
});
