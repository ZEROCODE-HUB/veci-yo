import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/auth-store";
import { useCondominioActivo } from "@/shared/hooks";
import { obtenerReputacion } from "../services/home.repo";

/**
 * Insignias acumuladas del usuario actual.
 *
 * Decision del 21/07/2026: solo acumulacion, sin niveles ni progresion.
 */
export function useReputacionUsuario() {
  const usuarioId = useAuthStore((s) => s.usuarioId ?? "");
  const condominioId = useCondominioActivo() ?? "";

  const { data } = useQuery({
    queryKey: ["home", "reputacion", usuarioId, condominioId],
    queryFn: () => obtenerReputacion(usuarioId, condominioId),
    enabled: Boolean(usuarioId && condominioId),
  });

  return data ?? [];
}
