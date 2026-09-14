import React, { useEffect, useLayoutEffect, useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  View,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import { useAuthStore, useChatStore } from "@/stores";
import type { SharedStackParamList, Conversation } from "@/shared/types";
import { ChatComposer, ChatThread } from "../components/chat";
import { useChatConversations } from "../hooks/useChatConversations";

export function ChatConversacionScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<SharedStackParamList, "ChatConversacion">>();
  const { usuario } = useAuthStore();
  const {
    mensajes,
    gruposChat,
    enviarMensaje,
    enviarMensajeGrupo,
    marcarMensajesPersonaLeidos,
    marcarMensajesGrupoLeidos,
  } = useChatStore();
  const [texto, setTexto] = useState("");

  const { conversations } = useChatConversations({
    soloNoLeidos: false,
    filtroChat: "todos",
    tabActiva: "torres",
    filtroTorre: "",
    filtroDepto: "",
  });

  const conversation = useMemo<Conversation>(() => {
    return (
      conversations.find((item) => item.id === route.params.conversationId) ?? {
        id: route.params.conversationId,
        tipo: "individual",
        nombre: route.params.conversationId,
        ultimoMensaje: "",
        ultimaHora: "",
        ultimaFecha: "",
        avatarEmoji: "👤",
        noLeidos: 0,
      }
    );
  }, [conversations, route.params.conversationId]);

  const mensajesVisibles = useMemo(() => {
    if (conversation.tipo === "grupo") {
      return gruposChat.find((grupo) => grupo.id === conversation.grupoId)?.mensajes ?? [];
    }

    return mensajes.filter((mensaje) => mensaje.persona === conversation.nombre);
  }, [conversation, gruposChat, mensajes]);

  useLayoutEffect(() => {
    navigation.setOptions({ title: conversation.nombre });
  }, [conversation.nombre, navigation]);

  useEffect(() => {
    if (conversation.tipo === "grupo") {
      marcarMensajesGrupoLeidos(conversation.grupoId!);
    } else {
      marcarMensajesPersonaLeidos(conversation.nombre);
    }
  }, [
    conversation.tipo,
    conversation.grupoId,
    marcarMensajesGrupoLeidos,
    marcarMensajesPersonaLeidos,
  ]);

  const handleSend = () => {
    const mensaje = texto.trim();
    if (!mensaje) return;

    if (conversation.tipo === "grupo") {
      enviarMensajeGrupo(
        mensaje,
        conversation.grupoId!,
        usuario?.nombre || "Yo",
      );
    } else {
      enviarMensaje(mensaje, conversation.nombre);
    }

    setTexto("");
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={0}
    >
      <View className="flex-1 bg-white">
        <ChatThread conversation={conversation} messages={mensajesVisibles} />
        <ChatComposer
          value={texto}
          onChangeText={setTexto}
          onSend={handleSend}
        />
      </View>
    </KeyboardAvoidingView>
  );
}
