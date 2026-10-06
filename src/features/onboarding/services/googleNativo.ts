import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { supabase } from "@/shared/services/supabase";

/**
 * Entrar con Google **en el teléfono**.
 *
 * En web basta con mandar a la persona a Google y dejar que vuelva a la misma
 * página. En el teléfono no hay página a la que volver: hace falta una
 * dirección propia de la aplicación —`veciyo://`, declarada en `app.json`— y
 * **abrir el navegador uno mismo**, porque una aplicación nativa no navega
 * sola.
 *
 * El recorrido es:
 *
 *   1. se le pide a Supabase la dirección de Google, sin redirigir
 *      (`skipBrowserRedirect`);
 *   2. se abre en el navegador del sistema y se espera a que vuelva a
 *      `veciyo://`;
 *   3. de la vuelta llegan `code` o los tokens, y la sesión se establece aquí.
 *
 * ## Esto no está recorrido en un teléfono, y hay que decirlo
 *
 * Rule 10 de AGENTS.md: nada se reporta como terminado sin haberlo recorrido
 * con el rol que lo usa. **Esto no se ha podido recorrer**: no hay todavía una
 * compilación de la aplicación en un dispositivo —faltan las cuentas de las
 * tiendas— y el navegador no sirve para probarlo, porque el camino que se
 * prueba es justamente el que no es el navegador.
 *
 * Así que está escrito y **sin estrenar**. Está en `REVISAR-A-OJO.md`. Lo que
 * falta para darlo por bueno es una sola cosa: una compilación de desarrollo
 * en un móvil y pulsar el botón.
 *
 * Lo que sí se puede afirmar: la dirección propia está declarada, el paquete
 * instalado, y la dirección de vuelta hay que **añadirla a la lista de
 * permitidas de Supabase** o la vuelta se rechaza sin explicación.
 */
export async function iniciarSesionConGoogleNativo() {
  // `veciyo://entrar`. Se construye y no se escribe a mano: en una compilación
  // de desarrollo la dirección no es `veciyo://` sino la del servidor de Expo,
  // y escribirla fija haría que funcionara en producción y no al probarla.
  const volverA = Linking.createURL("entrar");

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: volverA, skipBrowserRedirect: true },
  });
  if (error) throw error;
  if (!data.url) throw new Error("Google no devolvió a dónde ir");

  const resultado = await WebBrowser.openAuthSessionAsync(data.url, volverA);

  // La persona cerró el navegador. No es un error: es que cambió de idea, y
  // tratarlo como fallo le pondría un mensaje rojo por haberse arrepentido.
  if (resultado.type !== "success") return null;

  const vuelta = new URL(resultado.url);

  /*
    Supabase devuelve de dos formas según cómo esté configurado el proyecto:
    un `code` que hay que canjear, o los tokens directamente en el fragmento
    (`#access_token=...`). Se admiten las dos: dar por hecha una y que el
    proyecto use la otra deja a la persona mirando el navegador sin entrar.
  */
  const code = vuelta.searchParams.get("code");
  if (code) {
    const { data: sesion, error: errorCanje } =
      await supabase.auth.exchangeCodeForSession(code);
    if (errorCanje) throw errorCanje;
    return sesion;
  }

  const fragmento = new URLSearchParams(vuelta.hash.replace(/^#/, ""));
  const access_token = fragmento.get("access_token");
  const refresh_token = fragmento.get("refresh_token");
  if (access_token && refresh_token) {
    const { data: sesion, error: errorSesion } = await supabase.auth.setSession({
      access_token,
      refresh_token,
    });
    if (errorSesion) throw errorSesion;
    return sesion;
  }

  // Y si no llega ninguna de las dos, se dice qué pasó en vez de quedarse
  // callado: el motivo suele venir en la propia dirección.
  const motivo =
    vuelta.searchParams.get("error_description") ??
    fragmento.get("error_description") ??
    "Google no devolvió la sesión";
  throw new Error(motivo);
}
