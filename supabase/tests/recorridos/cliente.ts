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
 * Las sesiones ya abiertas, por correo.
 *
 * Existe por una razón concreta: **Supabase limita cuántas veces por hora se
 * puede entrar con contraseña**, y la suite hacía una llamada de esas por cada
 * `entrarComo` --unas seiscientas en una corrida entera--. Pasado el límite,
 * archivos enteros se caían en el `beforeAll` con un error de red, y el
 * conjunto se ponía rojo por sitios que no tenían nada que ver con lo que se
 * había tocado. Costó media tarde entender que el fallo no era del código.
 *
 * Reentrar con el token guardado no gasta ese cupo. La sesión sigue siendo de
 * verdad --emitida por GoTrue, con los mismos claims--, así que las políticas
 * se aplican igual; lo único que cambia es que no se vuelve a teclear la
 * contraseña.
 */
const sesiones = new Map<string, { access_token: string; refresh_token: string }>();

/**
 * Abre sesión con una de las cuentas de prueba y deja al cliente hablando en su
 * nombre. Devuelve el `uuid`, que hace falta para las columnas de autoría.
 */
export async function entrarComo(correo: string): Promise<string> {
  const guardada = sesiones.get(correo);
  if (guardada) {
    const { data, error } = await supabase.auth.setSession(guardada);
    if (!error && data.session && data.user) {
      sesiones.set(correo, {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      });
      return data.user.id;
    }
    // Caducada o revocada: se entra con contraseña, que es lo que había antes.
    sesiones.delete(correo);
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: correo,
    password: CLAVE_PRUEBA,
  });
  if (error) {
    throw new Error(`No se pudo entrar como ${correo}: ${error.message}`);
  }
  if (data.session) {
    sesiones.set(correo, {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    });
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

/**
 * Deja vigente hoy la estancia de un huésped, y devuelve cómo restaurarla.
 *
 * Existe por un fallo que apareció **solo por el paso de los días**. Las dos
 * membresías de huésped de prueba iban del 21/09 al 26/09, y el 27/09
 * `huesped-cancela-su-reserva` se puso en rojo con «new row violates row-level
 * security policy for table reserva_zona»: la política llama a
 * `es_huesped_alojado`, que exige `vigente_hasta >= current_date`, y ya no lo
 * era.
 *
 * El error no dice nada de fechas y parece un problema de permisos, así que se
 * busca en el sitio equivocado. Y es una bomba de tiempo: cada día que pasa
 * caduca algo más y los recorridos del huésped se van cayendo de uno en uno.
 *
 * Un recorrido que necesita una estancia vigente **se la trae**, como cualquier
 * otro dato. Devuelve una función que restaura las fechas exactas que había:
 * son datos que ve el cliente en la aplicación y no se cambian de tapadillo.
 */
export async function conEstanciaVigente(
  unidadId: string,
  correos: string[],
): Promise<() => Promise<void>> {
  const hoy = new Date();
  const desde = new Date(hoy);
  desde.setDate(desde.getDate() - 1);
  const hasta = new Date(hoy);
  hasta.setDate(hasta.getDate() + 7);
  const iso = (d: Date) => d.toISOString().slice(0, 10);

  /*
    El correo no esta en `perfil` --la regla 3 lo prohibe: la identidad es
    `auth.users.id` y el correo es un atributo que cambia--, asi que se resuelve
    entrando como cada uno, que es lo que `entrarComo` ya devuelve. Al terminar
    se deja la sesion que hubiera.
  */
  const sesionPrevia = (await supabase.auth.getUser()).data.user?.email ?? null;
  const ids: string[] = [];
  for (const correo of correos) ids.push(await entrarComo(correo));
  await salir();
  if (sesionPrevia) await entrarComo(sesionPrevia);
  if (ids.length === 0) return async () => {};

  const { data: antes, error } = await servicio
    .from("membresia_unidad")
    .select("id, vigente_desde, vigente_hasta")
    .eq("unidad_id", unidadId)
    .eq("rol", "huesped_temporal")
    .in("usuario_id", ids);
  if (error) throw error;

  for (const fila of antes ?? []) {
    const { error: errorAlAbrir } = await servicio
      .from("membresia_unidad")
      .update({ vigente_desde: iso(desde), vigente_hasta: iso(hasta) })
      .eq("id", fila.id);
    if (errorAlAbrir) throw errorAlAbrir;
  }

  return async () => {
    for (const fila of antes ?? []) {
      const { error: errorAlCerrar } = await servicio
        .from("membresia_unidad")
        .update({
          vigente_desde: fila.vigente_desde,
          vigente_hasta: fila.vigente_hasta,
        })
        .eq("id", fila.id);
      // Una limpieza que no comprueba si limpió no es una limpieza.
      if (errorAlCerrar) throw errorAlCerrar;
    }
  };
}

/**
 * Una fecha relativa a hoy, en el formato que usa la aplicación.
 *
 * Los recorridos escribían fechas fijas —«01/10/2026»— para decir «dentro de
 * unos días». El 27/09/2026 cuatro de ellas estaban a cuatro días de caducar, y
 * cuando caducan el disparador que impide crear una visita en el pasado las
 * rechaza: el recorrido se cae en su `beforeAll` con un error que no habla de
 * fechas y parece que lo rompió el último cambio.
 *
 * Lo que las pruebas quieren decir es «dentro de N días», así que se escribe
 * eso. `enDias(4)` en lugar de una fecha que el calendario va a alcanzar.
 */
export function enDias(dias: number): string {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  return [
    String(d.getDate()).padStart(2, "0"),
    String(d.getMonth() + 1).padStart(2, "0"),
    d.getFullYear(),
  ].join("/");
}

/** La misma fecha, como la guarda Postgres. */
export function isoEnDias(dias: number): string {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("-");
}
