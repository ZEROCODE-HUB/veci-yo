import { theme } from "@/config";
import React, { useRef, useEffect } from "react";
import { View, Text, ScrollView } from "react-native";
import { useGuardiasDeTurno } from "../../hooks/useGuardiasDeTurno";
import { EtiquetaVivienda } from "@/shared/components";
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
          <Text
            className="text-xs"
            style={{ color: theme.colors.secondaryDark }}
          >
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
          <Text
            className="text-xs"
            style={{ color: theme.colors.badgeGreenText }}
          >
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
            // El prototipo comparaba contra el literal "portero", asi que
            // en el telefono de un residente sus propios mensajes salian del
            // lado equivocado. Y despues `de` valia "yo" para los propios,
            // asi que en un grupo el autor de los mios decia «yo».
            const isPortero = msg.esMio;
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
                    ? theme.colors.chatBurbujaPropia
                    : "transparent",
                  borderRadius: !msg.leido ? 8 : 0,
                }}
              >
                <View
                  className="w-9 h-9 rounded-full items-center justify-center"
                  style={{
                    backgroundColor: isGrupo
                      ? theme.colors.chatAcentoSuave
                      : isPortero
                        ? theme.colors.comunicacionNeutro
                        : theme.colors.chatAcento,
                  }}
                >
                  <Text style={{ fontSize: 18 }}>
                    {msg.avatarEmoji || "👤"}
                  </Text>
                </View>
                <View className="flex-1">
                  {isGrupo && (
                    /*
                      El nombre y el depto, juntos. Lo pidio el cliente el
                      02/10/2026: en un grupo de residentes esto era un nombre
                      a secas, y con el alias encendido --«Vecino
                      Misterioso»-- no identificaba a nadie. El depto viene
                      congelado en el mensaje; la administracion y la porteria
                      no tienen, y entonces no se pinta etiqueta.
                    */
                    <View className="flex-row items-center gap-1.5 mb-0.5">
                      <Text
                        className="text-xs font-semibold"
                        style={{ color: theme.colors.primary }}
                      >
                        {msg.de}
                      </Text>
                      <EtiquetaVivienda codigo={msg.unidad} />
                    </View>
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
