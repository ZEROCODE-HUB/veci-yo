import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/stores";
import { obtenerConversaciones } from "../services/chat.repo";

interface UseChatConversationsParams {
  soloNoLeidos: boolean;
  filtroChat: "todos" | "individuales" | "grupos";
  tabActiva: "torres" | "seguridad" | "admin";
  filtroTorre: string;
  filtroDepto: string;
}

export const CHAT_QUERY_KEY = ["chat", "conversaciones"];

/**
 * Conversaciones visibles para quien está en sesión.
 *
 * Antes se armaban agrupando los mensajes por el nombre de la otra persona, y
 * "Seguridad" y "Administrador" se inventaban en el cliente si no existían.
 * Ahora cada conversación es una fila y la política decide cuáles se devuelven:
 * un inquilino no ve el grupo de propietarios, y un residente no ve el hilo de
 * portería de la vivienda de al lado.
 */
export function useChatConversations({
  soloNoLeidos,
  filtroChat,
  tabActiva,
  filtroTorre,
  filtroDepto,
}: UseChatConversationsParams) {
  const rolActivo = useAuthStore((s) => s.rolActivo);
  const usuarioId = useAuthStore((s) => s.usuarioId ?? "");

  const unidadIds = useAuthStore((s) => s.unidades).map((u) => u.unidadId);
  const comoPersonal = rolActivo === "guardia" || rolActivo === "administrador";

  const query = useQuery({
    queryKey: [...CHAT_QUERY_KEY, usuarioId, comoPersonal],
    queryFn: () =>
      obtenerConversaciones({ usuarioId, comoPersonal, unidadIds }),
    enabled: Boolean(usuarioId),
  });

  const conversations = query.data ?? [];

  const esGuardia = rolActivo === "guardia";
  const esAdmin = rolActivo === "administrador";
  const esHuespedTemporal = rolActivo === "huesped-temporal";

  const convFiltradas = useMemo(
    () =>
      conversations.filter((c) => {
        if (soloNoLeidos && c.noLeidos === 0) return false;
        if (filtroChat === "individuales" && c.tipo !== "individual") return false;
        if (filtroChat === "grupos" && c.tipo !== "grupo") return false;

        if (esGuardia) {
          const esSeguridad = c.nombre.startsWith("Seguridad");
          const esAdministracion = c.nombre.startsWith("Administración");
          if (tabActiva === "seguridad") return esSeguridad;
          if (tabActiva === "admin") return esAdministracion;
          if (tabActiva === "torres") {
            if (esSeguridad || esAdministracion) return false;
            if (filtroTorre && !c.nombre.includes(filtroTorre)) return false;
            if (filtroDepto && !c.nombre.includes(filtroDepto)) return false;
          }
        }
        return true;
      }),
    [
      conversations,
      soloNoLeidos,
      filtroChat,
      esGuardia,
      tabActiva,
      filtroTorre,
      filtroDepto,
    ],
  );

  const totalNoLeidos = useMemo(
    () => conversations.reduce((suma, c) => suma + c.noLeidos, 0),
    [conversations],
  );

  return {
    ...query,
    conversations,
    convFiltradas,
    totalNoLeidos,
    esGuardia,
    esAdmin,
    esHuespedTemporal,
    soloSeguridadAdmin: esHuespedTemporal,
  };
}
