import { useNavigation } from "@react-navigation/native";
import { useState } from "react";
import { useChatStore } from "@/stores";
import { useChatConversations } from "./useChatConversations";
import type { Conversation } from "@/shared/types";

type FiltroChat = "todos" | "individuales" | "grupos";
type TabChat = "torres" | "seguridad" | "admin";

export function useChatScreen() {
  const navigation = useNavigation<any>();
  const { marcarMensajesLeidos } = useChatStore();

  const [soloNoLeidos, setSoloNoLeidos] = useState(false);
  const [filtroChat, setFiltroChat] = useState<FiltroChat>("todos");
  const [tabActiva, setTabActiva] = useState<TabChat>("torres");
  const [filtroTorre, setFiltroTorre] = useState("");
  const [filtroDepto, setFiltroDepto] = useState("");

  const datosConversaciones = useChatConversations({
    soloNoLeidos,
    filtroChat,
    tabActiva,
    filtroTorre,
    filtroDepto,
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
    marcarMensajesLeidos,
  };
}
