/**
 * Leer el calendario de un alojamiento (Airbnb y compañía).
 *
 * Airbnb **no da API** a un anfitrión suelto: lo único que publica es el enlace
 * de su calendario en formato iCalendar. Lo que trae, comprobado contra la
 * documentación del formato y los cambios que Airbnb hizo el 01/12/2019:
 *
 *     BEGIN:VEVENT
 *     DTSTART;VALUE=DATE:20260615
 *     DTEND;VALUE=DATE:20260618
 *     UID:1234abcd@airbnb.com
 *     SUMMARY:Reserved
 *     DESCRIPTION:Reservation URL: https://www.airbnb.com/hosting/reservations
 *      /details/HMABCD1234\nPhone Number (Last 4 Digits): 2959
 *     END:VEVENT
 *
 * O sea: **fechas, un identificador estable y el código de la reserva dentro de
 * la URL**. No viene el nombre del huésped, ni su correo, ni el teléfono
 * completo, ni cuántas personas son. Eso lo pone el anfitrión o lo rellena el
 * huésped en su preregistro, que es justo como se decidió el 02/10/2026.
 *
 * Este módulo es **solo texto**: no habla con la red ni con la base. Vive aquí
 * para que lo use la función que sincroniza, y se prueba desde las unitarias
 * de la aplicación --`src/features/huesped/services/ical.test.ts`-- en vez de
 * tener dos copias, que es el defecto que más veces ha salido en este proyecto.
 */

export interface ReservaDelCalendario {
  /** `UID` del evento. Es estable, así que es la llave para no duplicar. */
  uid: string;
  /** Día de entrada, `yyyy-MM-dd`. */
  desde: string;
  /** Día de salida, `yyyy-MM-dd`. */
  hasta: string;
  /** El código de la reserva, sacado de la URL. Null si no venía. */
  codigo: string | null;
  /** La URL de la reserva en el portal, tal cual. */
  url: string | null;
}

/**
 * Deshace el plegado de líneas.
 *
 * El formato parte las líneas largas a los 75 caracteres y continúa en la
 * siguiente **empezando por un espacio o un tabulador**. Sin deshacerlo, una
 * URL larga --que es justo nuestro caso-- llega cortada por la mitad y el
 * código de la reserva se pierde.
 */
function desplegar(texto: string): string[] {
  const lineas = texto.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  const salida: string[] = [];

  for (const linea of lineas) {
    if ((linea.startsWith(" ") || linea.startsWith("\t")) && salida.length > 0) {
      salida[salida.length - 1] += linea.slice(1);
    } else {
      salida.push(linea);
    }
  }
  return salida;
}

/** `PROP;PARAM=X:valor` → `{ nombre: 'PROP', valor: 'valor' }`. */
function partir(linea: string): { nombre: string; valor: string } | null {
  const corte = linea.indexOf(":");
  if (corte < 0) return null;
  const izquierda = linea.slice(0, corte);
  return {
    nombre: izquierda.split(";")[0].toUpperCase(),
    valor: linea.slice(corte + 1),
  };
}

/** `20260615` → `2026-06-15`. Devuelve null si no tiene esa forma. */
function fecha(valor: string): string | null {
  const limpio = valor.trim();
  const m = /^(\d{4})(\d{2})(\d{2})/.exec(limpio);
  if (!m) return null;
  return `${m[1]}-${m[2]}-${m[3]}`;
}

/**
 * El código de la reserva, que viaja **dentro de la URL** y no en un campo.
 *
 * Airbnb quitó el código del título del evento en 2019, pero el enlace a la
 * reserva sigue terminando en él: `.../reservations/details/HMABCD1234`.
 *
 * Se acepta cualquier portal, no solo Airbnb: lo que se busca es el último
 * tramo de la ruta. Si algún día el enlace cambia de forma, lo que se pierde es
 * el código --y queda la URL entera guardada-- en vez de romperse la
 * sincronización entera.
 */
export function codigoDeLaUrl(url: string | null): string | null {
  if (!url) return null;
  try {
    const ruta = new URL(url).pathname.replace(/\/+$/, "");
    const ultimo = ruta.split("/").pop() ?? "";
    return /^[A-Za-z0-9_-]{4,}$/.test(ultimo) ? ultimo : null;
  } catch {
    return null;
  }
}

/** La primera URL que aparezca en el texto de la descripción. */
function urlDe(descripcion: string): string | null {
  // En iCal el salto de línea viaja escapado como `\n`, literal.
  const plano = descripcion.replace(/\\n/g, "\n").replace(/\\,/g, ",");
  const m = /https?:\/\/\S+/.exec(plano);
  return m ? m[0].replace(/[.,;)]+$/, "") : null;
}

/**
 * Un bloqueo no es una reserva.
 *
 * Airbnb emite los días que el anfitrión cerró a mano con el título
 * «Airbnb (Not available)». Crear una estancia por cada uno llenaría la
 * portería de huéspedes que no existen.
 */
function esBloqueo(resumen: string): boolean {
  const r = resumen.toLowerCase();
  return (
    r.includes("not available") ||
    r.includes("unavailable") ||
    r.includes("blocked") ||
    r.includes("no disponible")
  );
}

/**
 * Lee un calendario entero y devuelve sus reservas.
 *
 * Lo que no entiende lo **salta en silencio**, a propósito: un calendario trae
 * eventos de todo tipo, y una reserva mal formada no debe impedir importar las
 * otras veinte.
 */
export function leerCalendario(texto: string): ReservaDelCalendario[] {
  const reservas: ReservaDelCalendario[] = [];
  let dentro = false;
  let campos: Record<string, string> = {};

  for (const linea of desplegar(texto)) {
    const limpia = linea.trim();

    if (limpia.toUpperCase() === "BEGIN:VEVENT") {
      dentro = true;
      campos = {};
      continue;
    }

    if (limpia.toUpperCase() === "END:VEVENT") {
      dentro = false;

      const desde = fecha(campos.DTSTART ?? "");
      const hasta = fecha(campos.DTEND ?? "");
      const uid = (campos.UID ?? "").trim();

      /*
        Sin fechas o sin identificador no hay nada que importar: el
        identificador es lo que impide duplicar en la siguiente pasada.
      */
      if (!desde || !hasta || !uid) continue;
      if (esBloqueo(campos.SUMMARY ?? "")) continue;

      const url = urlDe(campos.DESCRIPTION ?? "");
      reservas.push({ uid, desde, hasta, codigo: codigoDeLaUrl(url), url });
      continue;
    }

    if (!dentro) continue;

    const campo = partir(limpia);
    if (campo) campos[campo.nombre] = campo.valor;
  }

  return reservas;
}
