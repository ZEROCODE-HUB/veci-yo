import { AppState, Platform } from "react-native";
import { focusManager } from "@tanstack/react-query";

/*
  En el teléfono, volver a la app cuenta como «volver a mirar»: se releen las
  pantallas abiertas. En web eso ya lo hace el foco de la pestaña.

  Aparte de `providers.tsx` porque aquel lo importan las pruebas unitarias, que
  corren en Node y no pueden cargar `react-native`.
*/
export function releerAlVolverALaApp() {
  if (Platform.OS === "web") return;
  focusManager.setEventListener((alCambiar) => {
    const suscripcion = AppState.addEventListener("change", (estado) => {
      alCambiar(estado === "active");
    });
    return () => suscripcion.remove();
  });
}
