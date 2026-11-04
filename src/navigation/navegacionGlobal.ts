import { CommonActions, createNavigationContainerRef } from "@react-navigation/native";
import type { RootStackParamList } from "@/shared/types";

/**
 * La navegación de la app, para lo que vive fuera de una pantalla: tocar un
 * aviso push abre su pantalla (30/10/2026). Antes solo abría la app.
 */
export const navegacionGlobal = createNavigationContainerRef<RootStackParamList>();

/**
 * Abre una pantalla compartida dentro de la pestaña de Inicio, que es donde
 * vive la lista de avisos y donde están registradas todas las compartidas.
 */
export function abrirDesdeFuera(pantalla: string, parametros?: object) {
  if (!navegacionGlobal.isReady()) return;
  (navegacionGlobal.navigate as (nombre: string, params?: object) => void)("App", {
    screen: "InicioTab",
    params: { screen: pantalla, params: parametros },
  });
}

/**
 * Vuelve al Inicio de la app: cada pestaña a su primera pantalla. La
 * plataforma tiene su propio árbol, que entra o sale solo.
 */
export function irAlInicio() {
  if (!navegacionGlobal.isReady() || estaEnElInicio()) return;
  if (!navegacionGlobal.getRootState()?.routeNames.includes("App")) return;
  navegacionGlobal.dispatch(CommonActions.reset({ index: 0, routes: [{ name: "App" }] }));
}

/**
 * Si ya está en la primera pantalla de la primera pestaña. Para no rehacer
 * la app entera dos veces al cambiar de rol (Para Claude 219, 04/11/2026).
 */
export function estaEnElInicio(): boolean {
  const raiz = navegacionGlobal.getRootState();
  const app = raiz?.routes[raiz.index ?? 0];
  if (!app || app.name !== "App") return false;
  const pestanas = app.state;
  if (!pestanas) return true;
  if ((pestanas.index ?? 0) !== 0) return false;
  const pila = pestanas.routes[0]?.state;
  return !pila || (pila.index ?? 0) === 0;
}
