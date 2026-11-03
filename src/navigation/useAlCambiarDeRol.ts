import { useEffect, useRef } from "react";
import { CommonActions } from "@react-navigation/native";
import { useAuthStore } from "@/stores/auth-store";
import { useUIStore } from "@/stores";
import { PRESENTACION_DE_ROL } from "@/shared/constants/presentacionDeRoles";
import { navegacionGlobal } from "./navegacionGlobal";

/**
 * Al cambiar de rol, la app vuelve al Inicio del rol nuevo y dice a cuál se
 * cambió (Para Claude 206, 03/11/2026). Antes se quedaba en la pantalla de
 * antes --Zonas Comunes de la administración, vista como Seguridad--, aunque
 * el rol nuevo no pudiera entrar ahí.
 *
 * Vale también cuando el rol cambia solo: el propietario que se declara no
 * residente pasa a «Propietario no residente» (Para Claude 204), y ahora se
 * le avisa en vez de cambiarle la app sin decir nada.
 *
 * Al entrar (de ningún rol a uno) no hace nada: eso no es un cambio.
 */
export function useAlCambiarDeRol() {
  const rolActivo = useAuthStore((s) => s.rolActivo);
  const anterior = useRef(rolActivo);

  useEffect(() => {
    const antes = anterior.current;
    anterior.current = rolActivo;
    if (!antes || !rolActivo || antes === rolActivo) return;

    /*
      Reiniciar «App» sin estado deja cada pestaña en su primera pantalla. La
      plataforma tiene su propio árbol y entra o sale de él sola.
    */
    const conPlataforma = antes === "plataforma" || rolActivo === "plataforma";
    if (!conPlataforma && navegacionGlobal.isReady()) {
      navegacionGlobal.dispatch(
        CommonActions.reset({ index: 0, routes: [{ name: "App" }] }),
      );
    }
    useUIStore
      .getState()
      .addToast(`Cambiaste al rol ${PRESENTACION_DE_ROL[rolActivo].titulo}`, "success");
  }, [rolActivo]);
}
