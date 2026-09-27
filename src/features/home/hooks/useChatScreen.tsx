import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/stores";
import { marcarTodasLeidas } from "../services/chat.repo";
import { CHAT_QUERY_KEY, useChatConversations } from "./useChatConversations";
import type { Conversation } from "@/shared/types";
import { useNavegacion } from "@/shared/hooks";

type FiltroChat = "todos" | "individuales" | "grupos";
type TabChat = "torres" | "seguridad" | "admin";

export function useChatScreen() {
  const navigation = useNavegacion();

  const [soloNoLeidos, setSoloNoLeidos] = useState(false);
  const [filtroChat, setFiltroChat] = useState<FiltroChat>("todos");
  const [tabActiva, setTabActiva] = useState<TabChat>("torres");
  const [filtroTorre, setFiltroTorre] = useState("");
  const [filtroDepto, setFiltroDepto] = useState("");

  const queryClient = useQueryClient();
  const usuarioId = useAuthStore((s) => s.usuarioId ?? "");

  const datosConversaciones = useChatConversations({
    soloNoLeidos,
    filtroChat,
    tabActiva,
    filtroTorre,
    filtroDepto,
  });

  // Antes ponia `leido: true` en cada mensaje, que era un booleano compartido
  // por todos los que veian esa conversacion.
  const marcarTodas = useMutation({
    mutationFn: () =>
      marcarTodasLeidas({
        conversacionIds: datosConversaciones.conversations.map((c) => c.id),
        usuarioId,
      }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: CHAT_QUERY_KEY }),
  });

  const handleSelectConversation = (conv: Conversation) => {
    navigation.navigate("ChatConversacion", { conversationId: conv.id });
  };

  const handleNewChat = () => {
    navigation.navigate("ChatNuevo");
  };

  return {
    soloNoLeidos,
    filtroChat,
    tabActiva,
    filtroTorre,
    filtroDepto,
    ...datosConversaciones,
    setSoloNoLeidos,
    setFiltroChat,
    setTabActiva,
    setFiltroTorre,
    setFiltroDepto,
    handleSelectConversation,
    handleNewChat,
    marcarMensajesLeidos: () => marcarTodas.mutate(),
  };
}
