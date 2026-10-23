import { useMemo } from "react";
import { useAuthStore } from "@/stores";
import { formatDateTime } from "@/shared/utils";

/**
 * El texto de la marca de agua sobre un documento: quién lo mira, en qué papel
 * y cuándo. Lo usan la portería (23/10/2026) y el anfitrión (QA 23/10/2026).
 */
export function useMarcaDeAgua(papel: string): string {
  const usuario = useAuthStore((s) => s.usuario);
  return useMemo(() => {
    const quien = [usuario?.nombre, usuario?.apellido].filter(Boolean).join(" ") || papel;
    return `${quien} · ${papel} · ${formatDateTime(new Date())}`;
  }, [usuario?.nombre, usuario?.apellido, papel]);
}
