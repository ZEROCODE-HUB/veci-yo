import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Apoyo para las pruebas contra el Supabase real.
 *
 * Abren sesiones con los usuarios de prueba y hablan con PostgREST por HTTP,
 * igual que la app. No se usa el cliente de supabase-js a propósito: así se
 * comprueba lo que la API devuelve de verdad, incluidos los códigos de error
 * de las políticas.
 */

function leerEntorno(): Record<string, string> {
  const ruta = resolve(process.cwd(), ".env.local");
  const entorno: Record<string, string> = {};
  for (const linea of readFileSync(ruta, "utf-8").split("\n")) {
    const limpia = linea.trim();
    if (!limpia || limpia.startsWith("#") || !limpia.includes("=")) continue;
    const [clave, ...resto] = limpia.split("=");
    entorno[clave] = resto.join("=");
  }
  return entorno;
}

const entorno = leerEntorno();

export const URL = entorno.EXPO_PUBLIC_SUPABASE_URL;
export const CLAVE = entorno.EXPO_PUBLIC_SUPABASE_ANON_KEY;

/**
 * La clave de servicio. **Solo para la limpieza previa**, y solo sobre filas
 * que ninguna politica permite borrar porque son constancia de un hecho --un
 * reporte legal, una notificacion, una invitacion--. Esta bien que no se
 * puedan borrar; por eso mismo una suite que las crea no tiene con que
 * retirarlas.
 *
 * Nunca dentro de un caso: lo que se comprueba se comprueba con la sesion de
 * una persona, o no se esta comprobando ninguna politica.
 */
export const CLAVE_SERVICIO = entorno.SUPABASE_SERVICE_ROLE_KEY;

/** Contraseña común de las cuentas `@veciyo.test`. */
const CLAVE_PRUEBA = "Prueba123!";

export const CONDOMINIO = "11111111-1111-1111-1111-111111111111";

/** Las unidades del condominio de prueba. */
export const UNIDAD = {
  u101: "44444444-4444-4444-4444-444444444441",
  u205: "44444444-4444-4444-4444-444444444442",
  u102: "44444444-4444-4444-4444-444444444443",
  u301: "44444444-4444-4444-4444-444444444444",
} as const;

export interface Sesion {
  token: string;
  usuarioId: string;
  correo: string;
}

const cache = new Map<string, Sesion>();

export async function entrar(correo: string): Promise<Sesion> {
  const guardada = cache.get(correo);
  if (guardada) return guardada;

  const respuesta = await fetch(`${URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: CLAVE, "Content-Type": "application/json" },
    body: JSON.stringify({ email: correo, password: CLAVE_PRUEBA }),
  });

  if (!respuesta.ok) {
    throw new Error(
      `No se pudo entrar como ${correo}: ${respuesta.status} ${await respuesta.text()}`,
    );
  }

  const datos = await respuesta.json();
  const sesion = {
    token: datos.access_token,
    usuarioId: datos.user.id,
    correo,
  };
  cache.set(correo, sesion);
  return sesion;
}

/** Quién es quién en el condominio de prueba. */
export const CUENTA = {
  /** Marcela Sierra: administradora del condominio y propietaria de la 301. */
  admin: "admin@veciyo.test",
  /** Portería. */
  guardia: "guardia@veciyo.test",
  /** Guillermo Provenzano: propietario de la 101 y la 205. */
  propietario: "propietario@veciyo.test",
  /** Sofía Martínez: propietaria de la 102. */
  vecino: "vecino@veciyo.test",
  /**
   * Tomás Huésped: huésped temporal de la 102, **con la estancia vigente**.
   * No tiene ninguna otra membresía, así que sirve para comprobar el rol en
   * estado puro. Su `vigente_hasta` está fijado en 2030 a propósito: si fuera
   * una fecha cercana, estas pruebas empezarían a fallar solas al pasar el día.
   */
  huesped: "nuevo.inquilino@veciyo.test",
  /**
   * Ramiro: huésped de la misma 102 **con la estancia ya terminada** (agosto
   * de 2026). Es el control negativo de la caducidad: la membresía sigue
   * activa, lo único que cambió es la fecha.
   */
  huespedVencido: "huesped.pasado@veciyo.test",
  /**
   * Cuenta sin ninguna membresía, para recorrer el alta de un huésped desde
   * la invitación. Las pruebas la limpian y la vuelven a dar de alta en cada
   * corrida.
   */
  invitadoNuevo: "invitado.prueba@veciyo.test",
  /**
   * Nadia: aceptó la invitación pero **todavía no ha llegado** —su estancia
   * empieza dentro de diez días—. Es el tercer estado del huésped, entre el
   * que está alojado y el que ya se fue, y el que distingue
   * `es_huesped_con_reserva` de `es_huesped_alojado`.
   */
  huespedFuturo: "huesped.futuro@veciyo.test",
  /**
   * Laura Gómez: inquilina líder de la 205 —**vive en el edificio sin ser
   * dueña de nada**— y además huésped de la 102. Es quien distingue
   * "residentes" de "propietarios" en las pruebas de audiencia; sin una
   * cuenta así, las dos casillas darían el mismo resultado y no se notaría
   * que ninguna filtraba.
   */
  laura: "laura.invitada@veciyo.test",
  /**
   * Cuenta sin membresías, para comprobar que una invitación de **propietario**
   * se sigue aceptando. Es el caso que la protección de `membresia_unidad`
   * podría romper sin querer: nadie puede registrar un propietario salvo la
   * administración, y quien acepta la invitación no lo es.
   */
  propietarioNuevo: "propietario.nuevo@veciyo.test",
} as const;

export interface Respuesta<T = any> {
  estado: number;
  datos: T;
  mensaje?: string;
}

/**
 * Llama a PostgREST con la sesión indicada.
 *
 * Devuelve el estado sin lanzar: en estas pruebas un 403 es tan interesante
 * como un 200, y muchas veces es justo lo que se espera.
 */
export async function api<T = any>(
  sesion: Sesion,
  ruta: string,
  opciones: { metodo?: string; cuerpo?: unknown; prefer?: string } = {},
): Promise<Respuesta<T>> {
  const respuesta = await fetch(`${URL}${ruta}`, {
    method: opciones.metodo ?? "GET",
    headers: {
      apikey: CLAVE,
      Authorization: `Bearer ${sesion.token}`,
      "Content-Type": "application/json",
      Prefer: opciones.prefer ?? "return=representation",
    },
    body: opciones.cuerpo === undefined ? undefined : JSON.stringify(opciones.cuerpo),
  });

  const texto = await respuesta.text();
  let datos: any = null;
  try {
    datos = texto ? JSON.parse(texto) : null;
  } catch {
    datos = texto;
  }

  return {
    estado: respuesta.status,
    datos,
    mensaje: datos && typeof datos === "object" ? datos.message : undefined,
  };
}

/** Atajo para leer una tabla o vista. */
export const leer = <T = any>(sesion: Sesion, ruta: string) =>
  api<T>(sesion, `/rest/v1/${ruta}`);

/** Atajo para insertar. */
export const insertar = <T = any>(sesion: Sesion, tabla: string, fila: unknown) =>
  api<T>(sesion, `/rest/v1/${tabla}`, { metodo: "POST", cuerpo: fila });

/** Atajo para llamar a una función. */
export const rpc = <T = any>(sesion: Sesion, nombre: string, argumentos: unknown = {}) =>
  api<T>(sesion, `/rest/v1/rpc/${nombre}`, { metodo: "POST", cuerpo: argumentos });

/**
 * La marca que llevan las filas que crean las pruebas y no se pueden borrar
 * desde la API, o que se escapan cuando un caso falla a medias.
 *
 * Nació de contar las reservas de la base: **114, setenta de ellas creadas en
 * una sola jornada de pruebas**. Es el mismo problema que ya había pasado con
 * las PQRS (R-83), y se resuelve igual: que se puedan encontrar.
 */
export const MARCA_PRUEBA = "[prueba]";

/**
 * Borra lo que quedó de corridas anteriores.
 *
 * Se llama al empezar, no al terminar: si un caso falla a mitad, el `afterAll`
 * puede no llegar a ejecutarse, y la basura sobrevive hasta la siguiente.
 */
export async function purgarReservasDePrueba(sesion: Sesion) {
  await api(
    sesion,
    `/rest/v1/reserva_zona?comentarios=like.${encodeURIComponent("[prueba]%")}`,
    { metodo: "DELETE" },
  );
}

/** Una política rechaza con 403 (RLS) o 400 (restricción CHECK). */
export function fueRechazada(respuesta: Respuesta): boolean {
  return respuesta.estado === 403 || respuesta.estado === 400;
}


/**
 * Los buckets privados, por HTTP como todo lo demás.
 *
 * Guardan lo más delicado del producto —fotos de documentos de identidad y
 * comprobantes de pago con datos bancarios— y no tenían ninguna prueba.
 */
export async function subirArchivo(
  sesion: Sesion,
  bucket: string,
  ruta: string,
  marca: string,
): Promise<Respuesta> {
  // Los buckets solo aceptan imagenes y PDF, asi que se sube un PNG minimo con
  // la marca pegada detras: sirve para comprobar que el contenido no se filtra
  // sin tener que inventar un tipo que el bucket rechazaria.
  const png = Uint8Array.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
  ]);
  const cuerpo = new Uint8Array([...png, ...new TextEncoder().encode(marca)]);

  const respuesta = await fetch(`${URL}/storage/v1/object/${bucket}/${ruta}`, {
    method: "POST",
    headers: {
      apikey: CLAVE,
      Authorization: `Bearer ${sesion.token}`,
      "Content-Type": "image/png",
      "x-upsert": "true",
    },
    body: cuerpo,
  });
  const texto = await respuesta.text();
  return { estado: respuesta.status, datos: texto };
}

export async function descargarArchivo(
  sesion: Sesion,
  bucket: string,
  ruta: string,
): Promise<Respuesta> {
  const respuesta = await fetch(`${URL}/storage/v1/object/${bucket}/${ruta}`, {
    headers: { apikey: CLAVE, Authorization: `Bearer ${sesion.token}` },
  });
  const texto = await respuesta.text();
  return { estado: respuesta.status, datos: texto };
}

export async function borrarArchivo(
  sesion: Sesion,
  bucket: string,
  ruta: string,
): Promise<Respuesta> {
  const respuesta = await fetch(`${URL}/storage/v1/object/${bucket}/${ruta}`, {
    method: "DELETE",
    headers: { apikey: CLAVE, Authorization: `Bearer ${sesion.token}` },
  });
  const texto = await respuesta.text();
  return { estado: respuesta.status, datos: texto };
}

/**
 * Sube un PDF mínimo.
 *
 * `subirArchivo` manda siempre un PNG, y el bucket de reglamentos no acepta
 * imágenes a propósito: un reglamento es un documento, no una foto.
 */
export async function subirDocumento(
  sesion: Sesion,
  bucket: string,
  ruta: string,
  marca: string,
): Promise<Respuesta> {
  const cuerpo = new TextEncoder().encode(`%PDF-1.4\n${marca}\n%%EOF\n`);

  const respuesta = await fetch(`${URL}/storage/v1/object/${bucket}/${ruta}`, {
    method: "POST",
    headers: {
      apikey: CLAVE,
      Authorization: `Bearer ${sesion.token}`,
      "Content-Type": "application/pdf",
      "x-upsert": "true",
    },
    body: cuerpo,
  });
  const texto = await respuesta.text();
  return { estado: respuesta.status, datos: texto };
}

/**
 * Hoy, en la zona horaria del condominio.
 *
 * `new Date().toISOString().slice(0, 10)` da la fecha **en UTC**, y el
 * condominio de prueba está en Bogotá, cinco horas por detrás. Entre las 19:00
 * y la medianoche locales las dos fechas no coinciden, así que un turno creado
 * "para hoy" se guardaba con la fecha de mañana y `guardias_de_turno()`
 * —que sí mira la hora local, para eso se le puso `zona_horaria` al
 * condominio— no lo encontraba.
 *
 * Es un fallo que aparece cinco horas al día y desaparece solo, que es la peor
 * clase: parece intermitencia de red.
 */
export async function hoyEnElCondominio(sesion: Sesion): Promise<string> {
  const respuesta = await leer<Array<{ zona_horaria: string | null }>>(
    sesion,
    `condominio?select=zona_horaria&id=eq.${CONDOMINIO}`,
  );
  const zona = respuesta.datos?.[0]?.zona_horaria || "UTC";

  // `sv-SE` formatea como `yyyy-MM-dd`, que es lo que espera la base. El
  // resultado depende solo del instante y de la zona, no del equipo.
  return new Intl.DateTimeFormat("sv-SE", { timeZone: zona }).format(new Date());
}
