import { useCallback, useEffect, useState } from "react";
import { AppState } from "react-native";
import { permisosDeLlamada, type PermisosDeLlamada } from "../services/llamadasNativas";

/**
 * Si a este celular le falta algo para que la llamada llegue con la app
 * cerrada (28/10/2026). Se vuelve a mirar al volver a la app: quien pulsa
 * «Activar» va a los ajustes de Android y vuelve.
 *
 * `null` donde no aplica (web, iPhone, APK anterior al 6).
 */
export function usePermisosDeLlamada() {
  const [permisos, setPermisos] = useState<PermisosDeLlamada | null>(() => permisosDeLlamada());

  const releer = useCallback(() => setPermisos(permisosDeLlamada()), []);

  useEffect(() => {
    const suscripcion = AppState.addEventListener("change", (estado) => {
      if (estado === "active") releer();
    });
    return () => suscripcion.remove();
  }, [releer]);

  const falta = permisos !== null && (!permisos.pantallaCompleta || !permisos.sinAhorroDeBateria);
  return { permisos, falta, releer };
}
