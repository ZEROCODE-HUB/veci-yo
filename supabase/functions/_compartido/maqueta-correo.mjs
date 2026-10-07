/**
 * La maqueta de todos los correos de Veciyo. Una sola.
 *
 * ----------------------------------------------------------------------------
 * Por qué está aquí y en `.mjs`
 * ----------------------------------------------------------------------------
 * Hay **dos** sitios que mandan correo y no comparten runtime:
 *
 *   · `enviar-correo` —la función de Supabase, en Deno— manda los seis que van
 *     a alguien que todavía no tiene la aplicación: la invitación, el
 *     preregistro, los dos accesos y los dos recordatorios.
 *   · Supabase Auth manda los de la cuenta —confirmar el correo, recuperar la
 *     contraseña, el enlace mágico— con **sus propias plantillas**, que viven
 *     en la configuración del proyecto y se suben con
 *     `supabase/herramientas/subir-plantillas-de-correo.mjs`, que corre en Node.
 *
 * Si cada uno trae la suya, se separan. Ya pasó con el rango de horas de un
 * turno: un sitio escribía «08:00 - 16:00» y el otro «08:00 a 16:00», los dos
 * coherentes consigo mismos, y el borde de «está en turno» no se encendía para
 * nadie. Una maqueta de correo se separa igual y además se ve.
 *
 * `.mjs` porque es el único formato que **Deno y Node importan los dos** sin
 * compilar nada. Los tipos van al lado, en `maqueta-correo.d.mts`.
 *
 * ----------------------------------------------------------------------------
 * Por qué así y no más bonito
 * ----------------------------------------------------------------------------
 * Un correo no es una página. Gmail borra el `<style>`, Outlook pinta con el
 * motor de Word —sin `flex`, sin `grid`, sin `border-radius` en un `<div>`— y
 * muchos clientes **no cargan las imágenes** hasta que la persona lo pide. Así
 * que:
 *
 *   · tablas y estilos en línea, que es lo único que entienden todos;
 *   · el logotipo es **texto**, no una imagen. Si fuera una imagen, el correo
 *     se abriría sin cabecera en medio mundo, y además la imagen de marca es
 *     una decisión que el cliente todavía no ha tomado (REVISAR-A-OJO 153);
 *   · el botón se dibuja con una celda de color, porque un `<a>` con fondo y
 *     relleno no se pinta igual en Outlook;
 *   · y debajo del botón va **el enlace en crudo**, porque hay clientes de
 *     correo de empresa que convierten los botones en texto plano.
 *
 * Y cada correo se escribe **una vez**: de la misma descripción salen la
 * versión HTML y la de texto plano, que es la que ven los clientes que no
 * pintan HTML y la que decide buena parte del filtro de spam. Un correo con
 * HTML y sin texto se marca como sospechoso.
 */

const AMARILLO = "#F5B800";
const TINTA = "#111827";
const TEXTO = "#374151";
const SUAVE = "#9CA3AF";
const ENLACE = "#2563EB";
const FONDO = "#F2F2F7";
const LINEA = "#E5E7EB";

const TIPO =
  "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif";

/** El cierre, igual en todos salvo que el correo pida otro. */
export const PIE_POR_DEFECTO =
  "Si no esperabas este mensaje, puedes ignorarlo: sin abrir el enlace no pasa nada.";

/**
 * Lo que va dentro de un atributo o de un nodo de texto.
 *
 * Los nombres y los nombres de edificio los escribe gente, así que un apellido
 * con un `&` o unas comillas rompería la maqueta. Los marcadores de Supabase
 * —`{{ .ConfirmationURL }}`— no llevan ninguno de estos caracteres, así que
 * pasan enteros por aquí y se sustituyen después.
 */
function escapar(valor) {
  return String(valor ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Un párrafo del cuerpo. Acepta `\n` y lo convierte en salto. */
function parrafo(texto, primero) {
  const cuerpo = escapar(texto).replace(/\n/g, "<br />");
  return `<tr><td style="padding:${primero ? "18" : "0"}px 32px 14px 32px;">
<p style="margin:0;font:400 15px/1.65 ${TIPO};color:${TEXTO};">${cuerpo}</p>
</td></tr>`;
}

/**
 * El botón.
 *
 * La celda lleva el color y el radio; el `<a>` lleva el relleno. Al revés
 * —fondo en el `<a>`— Outlook pinta el color solo detrás de las letras.
 */
function boton({ texto, url }) {
  return `<tr><td style="padding:12px 32px 4px 32px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
<td bgcolor="${AMARILLO}" style="border-radius:10px;">
<a href="${url}" style="display:inline-block;padding:14px 30px;font:700 15px/1 ${TIPO};color:${TINTA};text-decoration:none;border-radius:10px;">${escapar(texto)}</a>
</td></tr></table>
</td></tr>`;
}

/** El enlace en crudo, para cuando el botón no sobrevive al cliente de correo. */
function enlaceCrudo(url) {
  return `<tr><td style="padding:10px 32px 0 32px;">
<p style="margin:0;font:400 12px/1.6 ${TIPO};color:${SUAVE};">Si el botón no funciona, copia esta dirección en tu navegador:<br />
<a href="${url}" style="color:${ENLACE};text-decoration:underline;word-break:break-all;">${url}</a></p>
</td></tr>`;
}

/** Un código para teclear, cuando el correo lleva código en vez de enlace. */
function codigo(valor) {
  return `<tr><td style="padding:14px 32px 4px 32px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
<td bgcolor="#FFF8E1" style="border-radius:10px;padding:16px 28px;">
<span style="font:700 28px/1 'SFMono-Regular',Consolas,'Liberation Mono',Menlo,monospace;color:${TINTA};letter-spacing:4px;">${valor}</span>
</td></tr></table>
</td></tr>`;
}

/**
 * De una descripción, las dos versiones.
 *
 * @param {object} correo
 * @param {string} correo.titulo      El encabezado, y lo primero que se lee.
 * @param {string} [correo.saludo]    «Hola Sofía,». Sin él, el correo empieza por el título.
 * @param {string[]} correo.parrafos  El cuerpo, en orden.
 * @param {{texto:string,url:string}} [correo.boton]
 * @param {string} [correo.codigo]    Un código para teclear, en vez de un botón.
 * @param {string} [correo.nota]      Una línea final en gris, antes de la raya.
 * @param {string} [correo.pie]       El cierre. Por defecto, `PIE_POR_DEFECTO`.
 */
export function componer(correo) {
  const pie = correo.pie ?? PIE_POR_DEFECTO;
  const cuerpo = correo.saludo
    ? [correo.saludo, ...correo.parrafos]
    : [...correo.parrafos];

  /* El adelanto que la bandeja enseña al lado del asunto. Si no se pone, el
     cliente de correo toma lo primero que encuentre, que suele ser el pie. */
  const adelanto = escapar(correo.parrafos[0] ?? correo.titulo).slice(0, 140);

  const html = `<!doctype html>
<html lang="es"><head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<meta name="color-scheme" content="light only" />
<title>${escapar(correo.titulo)}</title>
</head>
<body style="margin:0;padding:0;background-color:${FONDO};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;">${adelanto}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${FONDO};">
<tr><td align="center" style="padding:28px 12px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background-color:#FFFFFF;border-radius:16px;">
<tr><td style="height:6px;background-color:${AMARILLO};border-radius:16px 16px 0 0;font-size:0;line-height:0;">&nbsp;</td></tr>
<tr><td style="padding:26px 32px 0 32px;">
<span style="font:700 22px/1 ${TIPO};color:${TINTA};letter-spacing:-0.5px;">Veci<span style="color:${AMARILLO};">yo</span></span>
</td></tr>
<tr><td style="padding:22px 32px 0 32px;">
<h1 style="margin:0;font:700 21px/1.3 ${TIPO};color:${TINTA};">${escapar(correo.titulo)}</h1>
</td></tr>
${cuerpo.map((t, i) => parrafo(t, i === 0)).join("\n")}
${correo.boton ? boton(correo.boton) : ""}
${correo.codigo ? codigo(correo.codigo) : ""}
${correo.boton ? enlaceCrudo(correo.boton.url) : ""}
${
  correo.nota
    ? `<tr><td style="padding:18px 32px 0 32px;">
<p style="margin:0;font:400 13px/1.6 ${TIPO};color:${SUAVE};">${escapar(correo.nota)}</p>
</td></tr>`
    : ""
}
<tr><td style="padding:26px 32px 0 32px;">
<div style="height:1px;background-color:${LINEA};font-size:0;line-height:0;">&nbsp;</div>
</td></tr>
<tr><td style="padding:16px 32px 28px 32px;">
<p style="margin:0;font:400 13px/1.6 ${TIPO};color:${SUAVE};">${escapar(pie)}</p>
</td></tr>
</table>
<p style="margin:16px 0 0 0;font:400 12px/1.5 ${TIPO};color:${SUAVE};">Veciyo &middot; tu edificio, organizado</p>
</td></tr>
</table>
</body></html>`;

  const partes = [...cuerpo];
  if (correo.boton) partes.push(`${correo.boton.texto}:\n${correo.boton.url}`);
  if (correo.codigo) partes.push(`Tu código: ${correo.codigo}`);
  if (correo.nota) partes.push(correo.nota);

  const texto = `${correo.titulo}\n\n${partes.join("\n\n")}\n\n--\nVeciyo\n${pie}`;

  return { html, texto };
}
