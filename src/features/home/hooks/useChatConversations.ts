import { useMemo } from "react";
import { listaDe } from "@/shared/utils";
import { useQuery } from "@tanstack/react-query";
import { pasaElFiltroDePorteria } from "./filtroDePorteria";
import { useAuthStore } from "@/stores";
import { obtenerConversaciones } from "../services/chat.repo";

interface UseChatConversationsParams {
  soloNoLeidos: boolean;
  filtroChat: "todos" | "grupos";
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

  const conversations = listaDe(query.data);

  const esGuardia = rolActivo === "guardia";
  const esAdmin = rolActivo === "administrador";
  const esHuespedTemporal = rolActivo === "huesped-temporal";

  const convFiltradas = useMemo(
    () =>
      conversations.filter((c) => {
        if (soloNoLeidos && c.noLeidos === 0) return false;
        /*
          Hubo un filtro «Individuales» y se retiro el 07/10/2026: entre
          vecinos no se escribe --lo decidio el cliente-- asi que una
          conversacion directa ya no se puede crear y esa pestaña no podia
          enseñar nada nunca. Un filtro que siempre sale vacio se lee como que
          la aplicacion perdio los datos.
        */
        if (filtroChat === "grupos" && c.tipo !== "grupo") return false;

        if (esGuardia) {
          // La regla vive aparte, en `filtroDePorteria`, para poder invertirla
          // en una prueba sin montar media pantalla.
          return pasaElFiltroDePorteria(c, {
            tabActiva,
            filtroTorre,
            filtroDepto,
          });
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
