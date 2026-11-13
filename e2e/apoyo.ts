import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import type { Page } from "@playwright/test";

/**
 * Apoyo de los recorridos en el navegador (`npm run test:e2e`).
 *
 * Abren la aplicación web de verdad --la misma que se exporta para el
 * celular-- con una persona del edificio de pruebas, «Las Barranqueras 246»
 * (`supabase/herramientas/sembrar-edificio-de-pruebas.mjs`), y la recorren
 * como ella: pulsando, leyendo lo que sale.
 *
 * Existen por lo que pasó el 11/11/2026: el calendario de «Amigos o familia»
 * no tachaba las noches del huésped. La regla estaba escrita y probada, el
 * componente también, y la prueba del componente le **daba** las fechas ya
 * cargadas. Lo que fallaba era el paso de en medio --la consulta solo se
 * encendía para «Huésped temporal»--, y eso solo lo ve quien abre la pantalla.
 *
 * La sesión se abre **por código**: se pide el token a Auth y se deja en el
 * almacenamiento del navegador antes de que cargue la aplicación, igual que
 * lo dejaría ella al entrar. Nadie escribe una contraseña en la pantalla.
 */

function leerEntorno(): Record<string, string> {
  const entorno: Record<string, string> = {};
  for (const linea of readFileSync(resolve(process.cwd(), ".env.local"), "utf-8").split("\n")) {
    const limpia = linea.trim();
    if (!limpia || limpia.startsWith("#") || !limpia.includes("=")) continue;
    const [clave, ...resto] = limpia.split("=");
    entorno[clave] = resto.join("=").trim();
  }
  return entorno;
}

const entorno = leerEntorno();
const URL_BASE = entorno.EXPO_PUBLIC_SUPABASE_URL;
const ANON = entorno.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const REF = new globalThis.URL(URL_BASE).hostname.split(".")[0];

/** Contraseña común de las cuentas `@veciyo.test` (la misma que `supabase/tests/apoyo.ts`). */
const CLAVE_PRUEBA = "Prueba123!";

/**
 * La clave de servicio, **solo para preparar y limpiar** lo que el recorrido
 * necesita (una reserva de huésped, por ejemplo). Lo que se comprueba se
 * comprueba en la pantalla, con la sesión de la persona.
 */
export const servicio = createClient(URL_BASE, entorno.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

export const CONDOMINIO = "11111111-1111-1111-1111-111111111111";
export const UNIDAD = {
  u101: "44444444-4444-4444-4444-444444444441",
  u205: "44444444-4444-4444-4444-444444444442",
  u102: "44444444-4444-4444-4444-444444444443",
  u301: "44444444-4444-4444-4444-444444444444",
} as const;

/** Quién es quién (ver `CUENTA` en `supabase/tests/apoyo.ts`). */
export const CUENTA = {
  /** Marcela Sierra: administradora y propietaria de la 301. */
  admin: "admin@veciyo.test",
  /** Juan Franco: portería. */
  guardia: "guardia@veciyo.test",
  /** Guillermo Provenzano: propietario de la 101 y la 205. */
  propietario: "propietario@veciyo.test",
  /** Sofía Martínez: propietaria y anfitriona de la 102, que se alquila por noches. */
  vecino: "vecino@veciyo.test",
} as const;

export type Rol =
  | "propietario"
  | "inquilino-lider"
  | "residente"
  | "huesped-temporal"
  | "guardia"
  | "administrador"
  | "plataforma";

const sesiones = new Map<string, Record<string, unknown>>();

async function pedirSesion(correo: string): Promise<Record<string, unknown>> {
  const guardada = sesiones.get(correo);
  if (guardada) return guardada;
  const esperas = [2000, 5000, 15000, 30000];
  for (let intento = 0; ; intento += 1) {
    const r = await fetch(`${URL_BASE}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: { apikey: ANON, "Content-Type": "application/json" },
      body: JSON.stringify({ email: correo, password: CLAVE_PRUEBA }),
    });
    if (r.status === 429 && intento < esperas.length) {
      await new Promise((seguir) => setTimeout(seguir, esperas[intento]));
      continue;
    }
    if (!r.ok) throw new Error(`No se pudo entrar como ${correo}: ${r.status} ${await r.text()}`);
    const sesion = (await r.json()) as Record<string, unknown>;
    if (!sesion.expires_at) {
      sesion.expires_at = Math.floor(Date.now() / 1000) + Number(sesion.expires_in ?? 3600);
    }
    sesiones.set(correo, sesion);
    return sesion;
  }
}

/**
 * Abre la aplicación con la sesión de `correo` y con `rol` como rol activo.
 * Espera a que se vea la barra de abajo, que es lo que dice que ya entró.
 */
export async function entrarComo(page: Page, correo: string, rol: Rol, ruta = "/", listo = "Inicio") {
  const sesion = await pedirSesion(correo);
  const usuario = sesion.user as { id: string };
  await page.addInitScript(
    ([clave, valor, claveRol, valorRol]) => {
      // Solo la primera vez: si la prueba recarga, que no pise lo que cambió.
      if (sessionStorage.getItem("e2e-sembrada")) return;
      localStorage.setItem(clave, valor);
      localStorage.setItem(claveRol, valorRol);
      sessionStorage.setItem("e2e-sembrada", "1");
    },
    [`sb-${REF}-auth-token`, JSON.stringify(sesion), `veciyo.rol.${usuario.id}`, rol],
  );
  await page.goto(ruta);
  await page.getByText(listo, { exact: true }).last().waitFor({ timeout: 60_000 });
  return usuario.id;
}

/** Una fecha `yyyy-mm-dd` a `n` días de hoy, en Bogotá (la zona del edificio de pruebas). */
export function enDias(n: number): string {
  const hoy = new Date(Date.now() - 5 * 3600 * 1000);
  hoy.setUTCDate(hoy.getUTCDate() + n);
  return hoy.toISOString().slice(0, 10);
}

/** Comprueba un error de Supabase en la preparación: si falla, la prueba no sirve. */
export function sinError<T>(paso: string, r: { data: T; error: { message: string } | null }): T {
  if (r.error) throw new Error(`${paso}: ${r.error.message}`);
  return r.data;
}

/**
 * Un dueño de la plataforma de usar y tirar, con su perfil (como
 * `crearDuenoDePrueba` de la suite de la base). Se retira al terminar.
 */
export async function crearDuenoDePrueba(etiqueta: string) {
  const correo = `${etiqueta}-${Date.now().toString(36)}@veciyo.test`;
  const { data, error } = await servicio.auth.admin.createUser({
    email: correo,
    password: CLAVE_PRUEBA,
    email_confirm: true,
  });
  if (error) throw new Error(`No se pudo crear ${correo}: ${error.message}`);
  const id = data.user!.id;
  sinError("perfil", await servicio.from("perfil").insert({ id, nombre: "Dueño", apellido: "de prueba" }));
  sinError(
    "staff",
    await servicio.from("staff_plataforma").insert({ usuario_id: id, rol: "dueno", activo: true, nota: `[prueba] ${etiqueta}` }),
  );
  return {
    correo,
    retirar: async () => {
      await servicio.from("bitacora_plataforma").delete().eq("actor_id", id);
      const { error: e } = await servicio.auth.admin.deleteUser(id);
      if (e) throw new Error(`No se pudo retirar ${correo}: ${e.message}`);
    },
  };
}
