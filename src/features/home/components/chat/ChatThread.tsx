import { theme } from "@/config";
import React, { useRef, useEffect } from "react";
import { View, Text, ScrollView } from "react-native";
import { useGuardiasDeTurno } from "../../hooks/useGuardiasDeTurno";
import type { Conversation, MensajeChat } from "@/shared/types";

interface ChatThreadProps {
  conversation: Conversation;
  messages: MensajeChat[];
}

export function ChatThread({ conversation, messages }: ChatThreadProps) {
  const scrollRef = useRef<ScrollView>(null);
  const guardias = useGuardiasDeTurno();

  useEffect(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }, [messages]);

  return (
    <>
      {/* Security/Admin header info */}
      {conversation.nombre.startsWith("Seguridad") && (
        <View
          className="px-4 py-2 flex-row items-center gap-1.5"
          style={{
            backgroundColor: theme.colors.secondaryLight,
            borderBottomWidth: 1,
            borderBottomColor: theme.colors.border,
          }}
        >
          <Text>👮</Text>
          <Text className="text-xs" style={{ color: theme.colors.secondaryDark }}>
            Personal de seguridad de turno:{" "}
            <Text className="font-bold">
              {guardias.join(", ") || "sin turno asignado"}
            </Text>
          </Text>
        </View>
      )}
      {conversation.nombre.startsWith("Administración") && (
        <View
          className="px-4 py-2 flex-row items-center gap-1.5"
          style={{
            backgroundColor: theme.colors.successSoft,
            borderBottomWidth: 1,
            borderBottomColor: theme.colors.border,
          }}
        >
          <Text>🛡️</Text>
          <Text className="text-xs" style={{ color: theme.colors.badgeGreenText }}>
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
            style={{ color: theme.colors.textMuted }}
          >
            No hay mensajes en {conversation.nombre}
          </Text>
        ) : (
          messages.map((msg) => {
            const isGrupo = conversation.tipo === "grupo";
            // `de` vale "yo" cuando el mensaje es de quien esta en sesion; el
            // prototipo comparaba contra el literal "portero", asi que en el
            // telefono de un residente sus propios mensajes salian del lado
            // equivocado.
            const isPortero = msg.de === "yo";
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
                      style={{ color: theme.colors.primary }}
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
                      color: theme.colors.textMuted,
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
