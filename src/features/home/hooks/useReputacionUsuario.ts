import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/auth-store";
import { useCondominioActivo } from "@/shared/hooks";
import { obtenerReputacion } from "../services/home.repo";
import { estadoDe } from "@/shared/components";

/**
 * Insignias acumuladas del usuario actual.
 *
 * Decision del 21/07/2026: solo acumulacion, sin niveles ni progresion.
 */
export function useReputacionUsuario() {
  const usuarioId = useAuthStore((s) => s.usuarioId ?? "");
  const condominioId = useCondominioActivo() ?? "";

  const query = useQuery({
    queryKey: ["home", "reputacion", usuarioId, condominioId],
    queryFn: () => obtenerReputacion(usuarioId, condominioId),
    enabled: Boolean(usuarioId && condominioId),
  });

  /*
    Con su carga (13/11/2026): la pantalla de reputación enseñaba la tarjeta
    vacía mientras llegaban las insignias, y vacía para siempre si fallaban.
  */
  return { insignias: query.data ?? [], carga: estadoDe(query) };
}
