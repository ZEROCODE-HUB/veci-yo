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

/** Una política rechaza con 403 (RLS) o 400 (restricción CHECK). */
export function fueRechazada(respuesta: Respuesta): boolean {
  return respuesta.estado === 403 || respuesta.estado === 400;
}
