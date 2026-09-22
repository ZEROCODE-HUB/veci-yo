import React, { useLayoutEffect, useMemo, useState } from "react";
import { KeyboardAvoidingView, Platform, View } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import type { SharedStackParamList, Conversation } from "@/shared/types";
import { ChatComposer, ChatThread } from "../components/chat";
import { useChatConversations } from "../hooks/useChatConversations";
import { useChatConversacion } from "../hooks/useChatConversacion";

export function ChatConversacionScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<SharedStackParamList, "ChatConversacion">>();
  const conversacionId = route.params.conversationId;
  const [texto, setTexto] = useState("");

  const { conversations } = useChatConversations({
    soloNoLeidos: false,
    filtroChat: "todos",
    tabActiva: "torres",
    filtroTorre: "",
    filtroDepto: "",
  });

  const { mensajes, enviar, enviando } = useChatConversacion(conversacionId);

  const conversation = useMemo<Conversation>(
    () =>
      conversations.find((item) => item.id === conversacionId) ?? {
        id: conversacionId,
        tipo: "individual",
        nombre: "Conversación",
        ultimoMensaje: "",
        ultimaHora: "",
        ultimaFecha: "",
        avatarEmoji: "💬",
        noLeidos: 0,
      },
    [conversations, conversacionId],
  );

  useLayoutEffect(() => {
    navigation.setOptions({ title: conversation.nombre });
  }, [conversation.nombre, navigation]);

  const handleSend = () => {
    const mensaje = texto.trim();
    if (!mensaje || enviando) return;
    enviar(mensaje);
    setTexto("");
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={0}
    >
      <View className="flex-1 bg-white">
        <ChatThread conversation={conversation} messages={mensajes} />
        <ChatComposer
          value={texto}
          onChangeText={setTexto}
          onSend={handleSend}
        />
      </View>
    </KeyboardAvoidingView>
  );
}
