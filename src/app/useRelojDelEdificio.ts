import { useEffect } from "react";
import { AppState } from "react-native";
import { useAuthStore } from "@/stores/auth-store";
import { useCondominioActivo } from "@/shared/hooks";
import { sincronizarRelojDelEdificio } from "@/shared/services/relojDelEdificio";
import { olvidarRelojDelEdificio } from "@/shared/utils/reloj.util";

/** Cada cuánto se vuelve a preguntar, por si alguien cambia la hora del teléfono. */
const CADA_MS = 10 * 60_000;

/**
 * Mantiene el reloj de la app a la hora del edificio (04/11/2026): al entrar,
 * al cambiar de edificio, al volver la app a primer plano y cada diez minutos.
 * Si la base no responde, se queda con lo último que supo.
 */
export function useRelojDelEdificio() {
  const conSesion = useAuthStore((s) => s.autenticado && s.modo === "cuenta");
  const condominioId = useCondominioActivo();

  useEffect(() => {
    if (!conSesion) {
      olvidarRelojDelEdificio();
      return;
    }
    const sincronizar = () => {
      void sincronizarRelojDelEdificio(condominioId).catch(() => undefined);
    };
    sincronizar();
    const alVolver = AppState.addEventListener("change", (estado) => {
      if (estado === "active") sincronizar();
    });
    const intervalo = setInterval(sincronizar, CADA_MS);
    return () => {
      alVolver.remove();
      clearInterval(intervalo);
    };
  }, [conSesion, condominioId]);
}
