import React, { useLayoutEffect, useMemo, useState } from "react";
import { KeyboardAvoidingView, Platform, Text, View } from "react-native";
import { theme } from "@/config";
import { useRoute } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import type { SharedStackParamList, Conversation } from "@/shared/types";
import { ChatComposer, ChatThread } from "../components/chat";
import { useChatConversations } from "../hooks/useChatConversations";
import { useChatConversacion } from "../hooks/useChatConversacion";
import { useNavegacion } from "@/shared/hooks";
import { useAuthStore } from "@/stores";

export function ChatConversacionScreen() {
  const navigation = useNavegacion();
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

  const { mensajes, enviar, enviando, retirar } =
    useChatConversacion(conversacionId);

  /*
    La administración modera los canales de su edificio: es lo que pidió el
    cliente el 02/10/2026, y la otra mitad de que vea el canal. Un hilo con la
    portería no --D-13, no lo lee-- y una conversación directa entre dos
    vecinos es asunto suyo.
  */
  const rolActivo = useAuthStore((s) => s.rolActivo);

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
        <ChatThread
          conversation={conversation}
          messages={mensajes}
          onRetirar={retirar}
          modera={rolActivo === "administrador" && conversation.tipo === "grupo"}
        />
        {conversation.archivado ? (
          /*
            Un canal archivado conserva lo dicho y no recibe mas: lo rechaza un
            disparador en la base. Ofrecer la caja de escribir seria un control
            que siempre falla, que es peor que no tenerlo.
          */
          <View
            className="px-4 py-3"
            style={{
              borderTopWidth: 1,
              borderTopColor: theme.colors.border,
              backgroundColor: theme.colors.bgMuted,
            }}
          >
            <Text
              className="text-sm text-center"
              style={{ color: theme.colors.textMuted }}
            >
              Este canal está archivado. Se puede leer, no escribir.
            </Text>
          </View>
        ) : (
          <ChatComposer
            value={texto}
            onChangeText={setTexto}
            onSend={handleSend}
          />
        )}
      </View>
    </KeyboardAvoidingView>
  );
}
