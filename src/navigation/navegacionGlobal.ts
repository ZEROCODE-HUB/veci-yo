import { createNavigationContainerRef } from "@react-navigation/native";
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
