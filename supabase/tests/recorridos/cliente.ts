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
 *
 * `scope: "local"` **importa**. El ámbito por defecto de `signOut` es
 * `global`, que revoca los tokens de refresco de esa cuenta **en todas
 * partes**: si alguien está recorriendo la aplicación en el navegador con la
 * misma cuenta de prueba, la suite le cierra la sesión por debajo y parece que
 * la app le echó sola. Pasó, y costó un rato entender que no era un defecto.
 *
 * Aquí no hace falta el alcance global: lo que se quiere es que **este**
 * cliente deje de hablar en nombre de esa persona, nada más.
 */
export async function salir(): Promise<void> {
  await supabase.auth.signOut({ scope: "local" });
}

/**
 * La escoba: un cliente con la clave de servicio, **solo para retirar lo que un
 * recorrido creó y ninguna política permite borrar**.
 *
 * Hay filas que a propósito no tienen política de baja porque son constancia de
 * un hecho: una notificación, una invitación, una conversación. Está bien que
 * sea así, y precisamente por eso un recorrido que necesite crear una no tiene
 * con qué retirarla después.
 *
 * Reglas de uso, que son estrechas a propósito:
 *
 *   · **nunca** dentro de un caso: lo que se comprueba se comprueba con la
 *     sesión de una persona, o no se está comprobando ninguna política;
 *   · solo en `afterAll`, y solo sobre filas que el propio recorrido creó y
 *     tiene apuntadas por `id`;
 *   · jamás un borrado por filtro ancho --`like`, un rango de fechas, una
 *     tabla entera--: con la clave de servicio no hay RLS que pare un `delete`
 *     que se pasa de listo, y ya hubo una madrugada de reparar cuotas y
 *     notificaciones de un cliente por escribir de más.
 */
export const servicio: SupabaseClient = createClient(
  url,
  entorno().SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  },
);
