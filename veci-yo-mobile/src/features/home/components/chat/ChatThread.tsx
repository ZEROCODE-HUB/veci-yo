import React, { useRef, useEffect } from "react";
import { View, Text, ScrollView } from "react-native";
import { guardiasSeguridad } from "@/data/chatMockData";
import type { Conversation, MensajeChat } from "@/shared/types";

interface ChatThreadProps {
  conversation: Conversation;
  messages: MensajeChat[];
}

export function ChatThread({ conversation, messages }: ChatThreadProps) {
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }, [messages]);

  return (
    <>
      {/* Security/Admin header info */}
      {conversation.nombre === "Seguridad" && (
        <View
          className="px-4 py-2 flex-row items-center gap-1.5"
          style={{
            backgroundColor: "#EFF6FF",
            borderBottomWidth: 1,
            borderBottomColor: "#E5E7EB",
          }}
        >
          <Text>👮</Text>
          <Text className="text-xs" style={{ color: "#1E40AF" }}>
            Personal de seguridad de turno:{" "}
            <Text className="font-bold">
              {guardiasSeguridad.map((g) => g.nombre).join(", ")}
            </Text>
          </Text>
        </View>
      )}
      {conversation.nombre === "Administrador" && (
        <View
          className="px-4 py-2 flex-row items-center gap-1.5"
          style={{
            backgroundColor: "#F0FDF4",
            borderBottomWidth: 1,
            borderBottomColor: "#E5E7EB",
          }}
        >
          <Text>🛡️</Text>
          <Text className="text-xs" style={{ color: "#166534" }}>
            Chat con <Text className="font-bold">Administración</Text> — el
            mensaje será visible para todo el equipo administrativo.
          </Text>
        </View>
      )}

      {/* Messages */}
      <ScrollView
        ref={scrollRef}
        className="flex-1 px-4 py-4"
        contentContainerClassName="gap-0.5"
      >
        {messages.length === 0 ? (
          <Text
            className="text-sm text-center py-10"
            style={{ color: "#9CA3AF" }}
          >
            No hay mensajes en {conversation.nombre}
          </Text>
        ) : (
          messages.map((msg) => {
            const isGrupo = conversation.tipo === "grupo";
            const isPortero = msg.de === "portero";
            return (
              <View
                key={String(msg.id)}
                className="flex-row items-start gap-2 py-1.5 px-2 mb-0.5"
                style={{
                  flexDirection: isGrupo
                    ? "row"
                    : isPortero
                      ? "row-reverse"
                      : "row",
                  backgroundColor: !msg.leido
                    ? "rgba(37,99,235,0.05)"
                    : "transparent",
                  borderRadius: !msg.leido ? 8 : 0,
                }}
              >
                <View
                  className="w-9 h-9 rounded-full items-center justify-center"
                  style={{
                    backgroundColor: isGrupo
                      ? "#E8F4FD"
                      : isPortero
                        ? "#9BA3AE"
                        : "#5B9BD5",
                  }}
                >
                  <Text style={{ fontSize: 18 }}>
                    {msg.avatarEmoji || "👤"}
                  </Text>
                </View>
                <View className="flex-1">
                  {isGrupo && (
                    <Text
                      className="text-xs font-semibold mb-0.5"
                      style={{ color: "#F5B800" }}
                    >
                      {msg.de}
                    </Text>
                  )}
                  <Text
                    className="text-base text-gray-900"
                    style={{ lineHeight: 20 }}
                  >
                    {msg.texto}
                  </Text>
                  <Text
                    className="text-xs mt-1"
                    style={{
                      color: "#9CA3AF",
                      textAlign: isGrupo
                        ? "left"
                        : isPortero
                          ? "right"
                          : "left",
                    }}
                  >
                    {msg.hora}
                    {"\n"}
                    {msg.fecha}
                  </Text>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </>
  );
}
