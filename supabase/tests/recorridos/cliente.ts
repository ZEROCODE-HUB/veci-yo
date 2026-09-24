import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * El puente entre las funciones de la app y una sesión de prueba.
 *
 * Los repositorios (`src/features/**\/services/*.repo.ts`) importan
 * `{ supabase }` de `@/shared/services/supabase`, un singleton que guarda la
 * sesión en SecureStore --o en `localStorage` en web-- y que arrastra
 * `react-native` y `expo-secure-store`. Nada de eso existe en Node.
 *
 * `vitest.rls.config.mts` tiene un alias que sustituye ese módulo por este
 * cuando corren las pruebas. Aquí el cliente es el mismo `@supabase/supabase-js`
 * con la misma clave anónima; lo único que cambia es dónde vive la sesión.
 *
 * La sesión se abre con `signInWithPassword`, igual que la pantalla de acceso:
 * el token que viaja en cada consulta es uno de verdad, emitido por GoTrue, no
 * una imitación. Por eso una prueba de recorrido comprueba las políticas de RLS
 * **y** el mapeo de datos del repositorio, que es donde vivía la mitad de los
 * defectos que encontró el cliente.
 */

function entorno(): Record<string, string> {
  const ruta = resolve(process.cwd(), ".env.local");
  const valores: Record<string, string> = {};
  for (const linea of readFileSync(ruta, "utf-8").split("\n")) {
    const limpia = linea.trim();
    if (!limpia || limpia.startsWith("#") || !limpia.includes("=")) continue;
    const [clave, ...resto] = limpia.split("=");
    valores[clave] = resto.join("=");
  }
  return valores;
}

const { EXPO_PUBLIC_SUPABASE_URL: url, EXPO_PUBLIC_SUPABASE_ANON_KEY: clave } =
  entorno();

/**
 * `persistSession: false` a propósito: cada archivo de pruebas tiene su propio
 * módulo, y una sesión guardada entre archivos haría que un recorrido heredara
 * el rol del anterior sin que nadie se diera cuenta.
 */
export const supabase: SupabaseClient = createClient(url, clave, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});

/** Contraseña común de las cuentas `@veciyo.test`. */
const CLAVE_PRUEBA = "Prueba123!";

/**
 * Abre sesión con una de las cuentas de prueba y deja al cliente hablando en su
 * nombre. Devuelve el `uuid`, que hace falta para las columnas de autoría.
 */
export async function entrarComo(correo: string): Promise<string> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: correo,
    password: CLAVE_PRUEBA,
  });
  if (error) {
    throw new Error(`No se pudo entrar como ${correo}: ${error.message}`);
  }
  return data.user!.id;
}

/**
 * Cierra la sesión. Se llama entre recorridos para que ninguno se apoye sin
 * querer en el rol del anterior: un caso negativo que pasa porque quedó abierta
 * la sesión de un administrador no prueba nada.
 */
export async function salir(): Promise<void> {
  await supabase.auth.signOut();
}
