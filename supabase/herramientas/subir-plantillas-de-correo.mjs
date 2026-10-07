/**
 * Las plantillas de correo de Supabase Auth, en castellano y con la marca.
 *
 * ----------------------------------------------------------------------------
 * Qué estaba pasando
 * ----------------------------------------------------------------------------
 * Los correos de la cuenta —confirmar el alta, recuperar la contraseña, el
 * enlace mágico— **no los manda la aplicación**: los manda Supabase Auth con
 * las plantillas que tiene guardadas el proyecto. Nunca se habían tocado, así
 * que salían las de fábrica: un `<h2>` y un enlace azul subrayado, **en
 * inglés**, firmados por nadie.
 *
 * El 06/10/2026 el cliente recibió los primeros —ese mismo día se conectó
 * Resend, que es lo que hizo que llegaran— y lo dijo: «ninguno se ve bien,
 * todos se ven básicos o con la plantilla por defecto de supabase en inglés».
 *
 * Tiene más fondo que el aspecto. El correo de confirmación es **lo primero
 * que recibe alguien de VeciYo**, antes de haber entrado una sola vez, y es el
 * paso sin el cual no hay cuenta. Uno en inglés y sin remitente reconocible es
 * exactamente lo que la gente borra o marca como spam.
 *
 * ----------------------------------------------------------------------------
 * Qué hace este script
 * ----------------------------------------------------------------------------
 * Compone las trece plantillas con `_compartido/maqueta-correo.mjs` —la misma
 * que usa `enviar-correo`, para que los dos caminos se vean igual—, las deja
 * en `supabase/correos/` para poder abrirlas en el navegador, y las sube a la
 * configuración del proyecto.
 *
 *   node supabase/herramientas/subir-plantillas-de-correo.mjs              (ver)
 *   node supabase/herramientas/subir-plantillas-de-correo.mjs --subir      (subir)
 *   node supabase/herramientas/subir-plantillas-de-correo.mjs --comprobar  (guarda)
 *
 * Sin `--subir` no toca nada: escribe los archivos y para. Eso es a propósito
 * —un cambio en los correos de una cuenta de producción se mira antes— y
 * además es lo que permite revisarlos sin tener el token delante.
 *
 * `--comprobar` es lo contrario: no escribe nada y falla si lo que hay en
 * `supabase/correos/` no es lo que saldría hoy de la maqueta. Va en `pretest`.
 * Sin él, tocar `maqueta-correo.mjs` deja los HTML del repositorio describiendo
 * unos correos y el proyecto mandando otros, y nada lo diría: los archivos son
 * para mirar, así que nadie los ejecuta. Es la misma forma que «un comentario
 * que afirma lo contrario de lo que hace el código».
 *
 * No comprueba lo que de verdad tiene Supabase —eso necesitaría el token y la
 * red, y `npm test` corre sin ninguna de las dos—. O sea que sigue habiendo un
 * paso a mano: después de cambiar un correo, `--subir`.
 *
 * ----------------------------------------------------------------------------
 * Los marcadores
 * ----------------------------------------------------------------------------
 * `{{ .ConfirmationURL }}` y compañía los sustituye Supabase al enviar, así
 * que viajan **tal cual** dentro del HTML. Pasan por el escapado de la maqueta
 * sin tocarse porque no llevan ningún carácter especial de HTML; si algún día
 * un marcador llevara un `&`, aquí es donde se rompería.
 */
import { writeFileSync, mkdirSync, readFileSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { componer } from "../functions/_compartido/maqueta-correo.mjs";

const RAIZ = resolve(import.meta.dirname, "..", "..");
const DESTINO = join(RAIZ, "supabase", "correos");
const PROYECTO = "qzuwnoqflaleujvlvxss";

/** El enlace de cada correo. Lo sustituye Supabase al enviar. */
const URL_CONFIRMACION = "{{ .ConfirmationURL }}";

/**
 * Las trece.
 *
 * Las seis primeras las manda Supabase cuando alguien hace algo. Las siete
 * últimas son **avisos de seguridad** y hoy están apagadas en el proyecto
 * (`mailer_notifications_*_enabled`); se traducen igual para que el día que se
 * enciendan no salgan en inglés, que es exactamente lo que acaba de pasar con
 * las otras seis.
 */
const PLANTILLAS = {
  confirmation: {
    asunto: "Confirma tu correo y entra a VeciYo",
    correo: {
      titulo: "Confirma tu correo",
      parrafos: [
        "Ya casi está. Pulsa el botón para confirmar que esta dirección es tuya y terminar de crear tu cuenta de VeciYo.",
        "VeciYo es la aplicación con la que tu edificio se organiza: visitas, correspondencia, zonas comunes y avisos.",
      ],
      boton: { texto: "Confirmar mi correo", url: URL_CONFIRMACION },
      nota: "El enlace caduca en una hora y se puede usar una sola vez.",
      pie: "Si no has creado ninguna cuenta en VeciYo, puedes ignorar este mensaje: sin abrir el enlace no se crea nada.",
    },
  },

  invite: {
    asunto: "Te invitaron a tu edificio en VeciYo",
    correo: {
      titulo: "Te invitaron a VeciYo",
      parrafos: [
        "Te han invitado a unirte a tu edificio en VeciYo. Pulsa el botón para aceptar la invitación y crear tu cuenta.",
        "Desde ahí podrás anunciar tus visitas, ver tu correspondencia, reservar las zonas comunes y hablar con la portería.",
      ],
      boton: { texto: "Aceptar la invitación", url: URL_CONFIRMACION },
    },
  },

  magic_link: {
    asunto: "Tu enlace para entrar a VeciYo",
    correo: {
      titulo: "Entra sin contraseña",
      parrafos: [
        "Pulsa el botón y entrarás a VeciYo directamente, sin teclear tu contraseña.",
      ],
      boton: { texto: "Entrar a VeciYo", url: URL_CONFIRMACION },
      nota: "El enlace caduca en una hora y se puede usar una sola vez.",
      pie: "Si no has pedido entrar, ignora este mensaje y no pulses el enlace. Tu cuenta sigue protegida con tu contraseña.",
    },
  },

  recovery: {
    asunto: "Cambia tu contraseña de VeciYo",
    correo: {
      titulo: "Cambia tu contraseña",
      parrafos: [
        "Hemos recibido una solicitud para cambiar la contraseña de tu cuenta de VeciYo. Pulsa el botón y elige una nueva.",
      ],
      boton: { texto: "Elegir una contraseña nueva", url: URL_CONFIRMACION },
      nota: "El enlace caduca en una hora y se puede usar una sola vez.",
      pie: "Si no has pedido cambiarla, ignora este mensaje: tu contraseña actual sigue funcionando y nadie la ha visto.",
    },
  },

  email_change: {
    asunto: "Confirma tu correo nuevo de VeciYo",
    correo: {
      titulo: "Confirma tu correo nuevo",
      parrafos: [
        "Has pedido cambiar el correo de tu cuenta de VeciYo de {{ .Email }} a {{ .NewEmail }}.",
        "Pulsa el botón desde esta dirección para confirmar el cambio.",
      ],
      boton: { texto: "Confirmar el cambio", url: URL_CONFIRMACION },
      pie: "Si no has pedido este cambio, ignora el mensaje: sin abrir el enlace tu correo no cambia.",
    },
  },

  reauthentication: {
    asunto: "{{ .Token }} es tu código de VeciYo",
    correo: {
      titulo: "Tu código de verificación",
      parrafos: [
        "Teclea este código en VeciYo para confirmar que eres tú.",
      ],
      codigo: "{{ .Token }}",
      nota: "El código caduca en una hora.",
      pie: "Si no has pedido ningún código, ignora este mensaje y no se lo des a nadie. Nadie de VeciYo te lo va a pedir.",
    },
  },

  /* ----------------------------------------------------------------------
     Los avisos de seguridad. Hoy apagados; traducidos por si se encienden.
     Ninguno promete un canal de soporte, porque todavía no hay uno
     publicado: decirle a alguien que escriba a un buzón que no existe es
     peor que no decir nada.
     ---------------------------------------------------------------------- */

  email_changed_notification: {
    asunto: "Tu correo de VeciYo ha cambiado",
    correo: {
      titulo: "Tu correo ha cambiado",
      parrafos: [
        "El correo de tu cuenta de VeciYo ha pasado de {{ .OldEmail }} a {{ .Email }}.",
      ],
      pie: "Si no has sido tú, cambia tu contraseña ahora mismo y avisa a la administración de tu edificio.",
    },
  },

  password_changed_notification: {
    asunto: "Tu contraseña de VeciYo ha cambiado",
    correo: {
      titulo: "Tu contraseña ha cambiado",
      parrafos: ["Acabas de cambiar la contraseña de tu cuenta de VeciYo."],
      pie: "Si no has sido tú, pide una contraseña nueva desde la pantalla de entrar y avisa a la administración de tu edificio.",
    },
  },

  phone_changed_notification: {
    asunto: "Tu teléfono de VeciYo ha cambiado",
    correo: {
      titulo: "Tu teléfono ha cambiado",
      parrafos: [
        "El teléfono de tu cuenta de VeciYo ha pasado de {{ .OldPhone }} a {{ .Phone }}.",
      ],
      pie: "Si no has sido tú, cambia tu contraseña ahora mismo y avisa a la administración de tu edificio.",
    },
  },

  identity_linked_notification: {
    asunto: "Añadiste una forma nueva de entrar a VeciYo",
    correo: {
      titulo: "Una forma nueva de entrar",
      parrafos: [
        "Tu cuenta de {{ .Provider }} quedó enlazada a {{ .Email }}: a partir de ahora puedes entrar a VeciYo con ella.",
      ],
      pie: "Si no has sido tú, cambia tu contraseña ahora mismo y quita ese enlace desde tu perfil.",
    },
  },

  identity_unlinked_notification: {
    asunto: "Quitaste una forma de entrar a VeciYo",
    correo: {
      titulo: "Se quitó una forma de entrar",
      parrafos: [
        "Tu cuenta de {{ .Provider }} ya no está enlazada a {{ .Email }}: con ella no se puede entrar a VeciYo.",
      ],
      pie: "Si no has sido tú, cambia tu contraseña ahora mismo.",
    },
  },

  mfa_factor_enrolled_notification: {
    asunto: "Añadiste una verificación nueva a VeciYo",
    correo: {
      titulo: "Una verificación nueva",
      parrafos: [
        "Se añadió una verificación de tipo {{ .FactorType }} a tu cuenta de VeciYo. Te la pedirá al entrar.",
      ],
      pie: "Si no has sido tú, cambia tu contraseña ahora mismo.",
    },
  },

  mfa_factor_unenrolled_notification: {
    asunto: "Quitaste una verificación de VeciYo",
    correo: {
      titulo: "Se quitó una verificación",
      parrafos: [
        "Se quitó la verificación de tipo {{ .FactorType }} de tu cuenta de VeciYo. Ya no te la pedirá al entrar.",
      ],
      pie: "Si no has sido tú, cambia tu contraseña ahora mismo.",
    },
  },
};

/** Los dos mensajes de texto, que no son correo pero estaban igual de ingleses. */
const SMS = {
  sms_template: "{{ .Code }} es tu código de VeciYo. No se lo des a nadie.",
  mfa_phone_template: "{{ .Code }} es tu código de VeciYo. No se lo des a nadie.",
};

const sinRetornos = (texto) => (texto === null ? null : texto.replace(/\r\n/g, "\n"));

const comprobar = process.argv.includes("--comprobar");
const config = {};
const desfasadas = [];

if (!comprobar) mkdirSync(DESTINO, { recursive: true });

for (const [nombre, { asunto, correo }] of Object.entries(PLANTILLAS)) {
  const { html } = componer(correo);
  const ruta = join(DESTINO, `${nombre}.html`);

  if (comprobar) {
    const enDisco = existsSync(ruta) ? readFileSync(ruta, "utf-8") : null;
    /*
      Comparando sin los retornos de carro. En Windows git los mete al sacar
      los archivos, así que recién clonado el repositorio **las trece** salían
      desfasadas: un guarda que grita en falso se acaba ignorando, y este lo
      habría hecho desde el primer `git clone`.

      Lo que importa es el contenido, no con qué los escribió el sistema de
      archivos: lo que se sube a Supabase es lo que sale de la maqueta, no lo
      que hay en disco.
    */
    if (sinRetornos(enDisco) !== sinRetornos(html)) desfasadas.push(nombre);
  } else {
    writeFileSync(ruta, html, "utf-8");
  }

  config[`mailer_subjects_${nombre}`] = asunto;
  config[`mailer_templates_${nombre}_content`] = html;
}
Object.assign(config, SMS);

const cuantos = Object.keys(PLANTILLAS).length;

if (comprobar) {
  console.log(`plantillas de correo revisadas: ${cuantos}`);
  console.log(`desfasadas respecto a la maqueta: ${desfasadas.length} (tope 0).`);
  for (const n of desfasadas) console.log(`  supabase/correos/${n}.html`);
  if (desfasadas.length > 0) {
    console.error(
      `\nLo que hay en supabase/correos/ no es lo que saldria hoy de la ` +
        `maqueta, asi que el repositorio describe unos correos y el proyecto ` +
        `manda otros. Se regenera y se sube:\n` +
        `  node supabase/herramientas/subir-plantillas-de-correo.mjs --subir`,
    );
    process.exit(1);
  }
  process.exit(0);
}

console.log(`${cuantos} plantillas escritas en supabase/correos/`);

if (!process.argv.includes("--subir")) {
  console.log("\nPara subirlas al proyecto: añade --subir");
  process.exit(0);
}

/* El token vive en `.env.local`, que no está en git. */
const env = join(RAIZ, ".env.local");
if (!existsSync(env)) {
  console.error("Falta .env.local con SUPABASE_ACCESS_TOKEN");
  process.exit(1);
}
const token = readFileSync(env, "utf-8").match(
  /^SUPABASE_ACCESS_TOKEN=(.+)$/m,
)?.[1]?.trim();
if (!token) {
  console.error("Falta SUPABASE_ACCESS_TOKEN en .env.local");
  process.exit(1);
}

const respuesta = await fetch(
  `https://api.supabase.com/v1/projects/${PROYECTO}/config/auth`,
  {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(config),
  },
);

if (!respuesta.ok) {
  console.error(`La API respondió ${respuesta.status}:`);
  console.error(await respuesta.text());
  process.exit(1);
}

console.log(`Subidas. ${cuantos} plantillas y 2 mensajes de texto.`);
