/**
 * enviar-correo · los correos que el producto manda fuera de la aplicación
 *
 * Sustituye a `enviar-invitacion`, que tenía el contrato definido, el nombre de
 * un solo caso y **el transporte sin implementar**: fallaba con un 501 a
 * propósito y la aplicación no la llamaba.
 *
 * Aquí están las cuatro plantillas y el transporte montado. Lo único que falta
 * para que salgan correos de verdad son **las credenciales del servidor**, que
 * se ponen como secretos y no tocan ni una línea de código:
 *
 *   supabase secrets set SMTP_HOST=... SMTP_PUERTO=587 \
 *     SMTP_USUARIO=... SMTP_CLAVE=... SMTP_DESDE="VeciYo <hola@tudominio>"
 *
 * Sin ellas responde **200 y `enviado: false`**, no un error: la aplicación ya
 * enseña el enlace en pantalla cuando el correo está apagado, y romper la
 * invitación entera porque no hay servidor de correo sería peor que no enviarla.
 *
 * ----------------------------------------------------------------------------
 * Los cuatro, y por qué solo cuatro
 * ----------------------------------------------------------------------------
 * Son los que van a alguien que **todavía no tiene la aplicación**: ahí el
 * correo es el único canal que hay. Lo demás --paquete recibido, reserva
 * aprobada, reconocimiento-- ya viaja como notificación dentro de la
 * aplicación, a gente que la tiene instalada, y duplicarlo por correo es una
 * decisión de producto que nadie ha tomado.
 *
 * Los de la cuenta --recuperar la contraseña, confirmar el correo-- no pasan
 * por aquí: los manda Supabase Auth con sus propias plantillas, y se configuran
 * en el proyecto, no en esta función.
 */
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";
import { CORS, responderPreflight } from "../_compartido/cors.ts";

type Tipo =
  | "invitacion"
  | "precheckin"
  | "acceso-huesped"
  | "acceso-acompanante"
  | "recordatorio-huesped"
  | "recordatorio-anfitrion";

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
}

const json = (cuerpo: unknown, status: number) =>
  new Response(JSON.stringify(cuerpo), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });

/**
 * Las cuatro plantillas.
 *
 * En texto plano a propósito: llega igual a cualquier cliente de correo, no
 * acaba en spam por una maquetación rara, y se lee bien en un móvil, que es
 * donde se va a abrir. Cuando haga falta una versión con imagen de marca, se
 * añade al lado sin tocar lo de aquí.
 *
 * Las cuatro dicen **qué es, quién lo manda y qué pasa si no era para ti**. Lo
 * último no es cortesía: un enlace de acceso a la casa de alguien que llega al
 * buzón equivocado tiene que poder ignorarse con confianza.
 */
function plantilla(p: Peticion): { asunto: string; texto: string } {
  const quien = p.nombre?.trim() ? `Hola ${p.nombre.trim()},` : "Hola,";
  /*
    Las dos piezas que pueden faltar. Se arman aqui con su preposicion para que
    la frase siga teniendo sentido cuando no vienen: «tu vivienda de Las
    Barranqueras» y «tu vivienda», no «tu vivienda de».
  */
  const donde = p.condominio ? ` de ${p.condominio}` : "";
  const enDonde = p.condominio ? ` en ${p.condominio}` : "";
  const dePartede = p.deParte ? ` por ${p.deParte}` : "";
  const quienReservo = p.deParte ? `${p.deParte} hizo` : "alguien hizo";
  const firma =
    "\n\n--\nVeciYo\nSi no esperabas este mensaje, puedes ignorarlo: " +
    "sin abrir el enlace no pasa nada.";

  switch (p.tipo) {
    case "invitacion":
      return {
        asunto: `Te invitaron a tu edificio en VeciYo`,
        texto:
          `${quien}\n\n` +
          `Te invitaron${dePartede} a unirte a tu vivienda${donde} en VeciYo, ` +
          `la aplicación con la que el edificio se organiza: visitas, ` +
          `correspondencia, zonas comunes y avisos.\n\n` +
          `Para aceptar la invitación y crear tu cuenta:\n${p.enlace}\n\n` +
          `El enlace vence en 14 días.` +
          firma,
      };

    case "precheckin":
      return {
        asunto: `Completa tu registro antes de llegar`,
        texto:
          `${quien}\n\n` +
          `Ya está lista tu estancia${enDonde}. Antes de llegar necesitamos tus ` +
          `datos y los de quienes vienen contigo: es lo que la portería ` +
          `comprueba en la puerta.\n\n` +
          `Son unos minutos:\n${p.enlace}\n\n` +
          `Hazlo antes de viajar. Si llegas sin este paso, la entrada tarda más.` +
          firma,
      };

    case "acceso-huesped":
      return {
        asunto: `Tu acceso a ${p.condominio ?? "tu alojamiento"}`,
        texto:
          `${quien}\n\n` +
          `Tu registro quedó completo. Con este enlace entras a la aplicación, ` +
          `donde tienes las instrucciones de llegada, la clave del wifi, las ` +
          `zonas comunes y el chat con la portería:\n\n${p.enlace}\n\n` +
          // Sin asteriscos: esto es un correo de texto, no markdown, y un
          // cliente de correo los enseña tal cual.
          `Guárdalo: es tu llave, y se abre una sola vez. Si lo pierdes, ` +
          `pídele a tu anfitrión que te lo vuelva a enviar.` +
          firma,
      };

    case "acceso-acompanante":
      return {
        asunto: `Completa tus datos para la estancia`,
        texto:
          `${quien}\n\n` +
          `Vas a alojarte${enDonde}, en la reserva que ${quienReservo}. La ` +
          `portería necesita tus datos para dejarte entrar, y solo los puedes ` +
          `poner tú.\n\n` +
          `Aquí:\n${p.enlace}\n\n` +
          `Si prefieres que los ponga quien hizo la reserva, dile y lo hace ` +
          `por ti; entonces puedes ignorar este correo.` +
          firma,
      };

    /*
      Los dos recordatorios. Lo que de verdad cambia entre el primero y el
      último es la urgencia: tres correos iguales se ignoran igual, así que la
      cuenta atrás va en el asunto y en la primera frase.
    */
    case "recordatorio-huesped":
      return {
        asunto:
          p.diasAntes === 1
            ? `Mañana llegas y te falta el registro`
            : `Te faltan ${cuantoFalta(p.diasAntes)} para llegar y el registro sigue sin terminar`,
        texto:
          `${quien}

` +
          `${
            p.diasAntes === 1
              ? `Mañana es tu entrada${enDonde} y tu registro todavía no está completo.`
              : `Tu entrada${enDonde} es en ${cuantoFalta(p.diasAntes)} y tu registro todavía no está completo.`
          }

` +
          `Sin él, la portería no tiene tus datos y la entrada se demora: hay ` +
          `que hacerlo todo en la puerta, con tus documentos en la mano.

` +
          `Son unos minutos:
${p.enlace}

` +
          // Y esto no es un detalle: si alguien tenía el anterior a medias, se
          // le acaba de caer. Mejor decirlo que dejarle descubrirlo.
          `Este enlace reemplaza a cualquiera que te hayamos mandado antes.` +
          firma,
      };

    case "recordatorio-anfitrion":
      return {
        asunto:
          p.diasAntes === 1
            ? `${p.deParte ?? "Tu huésped"} llega mañana sin registrarse`
            : `A ${p.deParte ?? "tu huésped"} le falta el registro`,
        texto:
          `${quien}

` +
          `${p.deParte ?? "Tu huésped"} llega ${
            p.diasAntes === 1 ? "mañana" : `en ${cuantoFalta(p.diasAntes)}`
          }${enDonde} y todavía no ha terminado su preregistro.

` +
          `Si no lo hace, la portería tendrá que tomarle los datos en la ` +
          `puerta, con los documentos de todos los que vengan.

` +
          // Deliberadamente sin enlace del huésped: el de él no se puede
          // recuperar, y emitirle uno nuevo desde aquí anularía el que
          // acabamos de mandarle a él.
          `Puedes reenviarle su enlace desde la reserva, en VeciYo:
${p.enlace}` +
          firma,
      };
  }
}

/** «7 días», «1 día». Sin esto salía «1 días» en el último recordatorio. */
function cuantoFalta(dias?: number): string {
  if (!dias || dias < 1) return "muy poco";
  return dias === 1 ? "1 día" : `${dias} días`;
}

/** Lo que hace falta para hablar con el servidor de correo. */
function credenciales() {
  const host = Deno.env.get("SMTP_HOST");
  const usuario = Deno.env.get("SMTP_USUARIO");
  const clave = Deno.env.get("SMTP_CLAVE");
  const desde = Deno.env.get("SMTP_DESDE");
  if (!host || !usuario || !clave || !desde) return null;

  return {
    host,
    puerto: Number(Deno.env.get("SMTP_PUERTO") ?? "587"),
    usuario,
    clave,
    desde,
  };
}

async function enviar(destino: string, asunto: string, texto: string) {
  const c = credenciales()!;

  const cliente = new SMTPClient({
    connection: {
      hostname: c.host,
      port: c.puerto,
      // 465 es TLS desde el saludo; 587 empieza en claro y sube con STARTTLS.
      tls: c.puerto === 465,
      auth: { username: c.usuario, password: c.clave },
    },
  });

  try {
    await cliente.send({ from: c.desde, to: destino, subject: asunto, content: texto });
  } finally {
    await cliente.close();
  }
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
  ];
  if (!cuerpo?.tipo || !tipos.includes(cuerpo.tipo)) {
    return json({ error: `El tipo tiene que ser uno de: ${tipos.join(", ")}` }, 400);
  }
  if (!cuerpo.correo || !cuerpo.enlace) {
    return json({ error: "Faltan campos: correo, enlace" }, 400);
  }

  const { asunto, texto } = plantilla(cuerpo);

  /*
    Sin credenciales se responde que **no se envió**, y con la plantilla dentro.
    Así la aplicación puede seguir --ya enseña el enlace en pantalla cuando el
    correo está apagado-- y además se puede ver qué se habría mandado sin tener
    que desplegar nada.
  */
  if (!credenciales()) {
    return json(
      { enviado: false, motivo: "El servidor de correo no está configurado", asunto, texto },
      200,
    );
  }

  try {
    await enviar(cuerpo.correo, asunto, texto);
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
