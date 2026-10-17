import { theme } from "@/config";
import React from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { cuandoFue } from "../../helpers/chatHelpers";
import type { Conversation } from "@/shared/types";
import { ANCHO_DEL_CHAT } from "./ChatThread";

interface ChatConversationListProps {
  conversations: Conversation[];
  onSelect: (conv: Conversation) => void;
  emptyMessage: string;
  /** Silenciar y volver a oír. Pedido por el cliente el 02/10/2026. */
  onSilenciar?: (conv: Conversation) => void;
}

export function ChatConversationList({
  conversations,
  onSelect,
  emptyMessage,
  onSilenciar,
}: ChatConversationListProps) {
  if (conversations.length === 0) {
    return (
      <View className="items-center py-16 px-6 gap-2">
        <Text style={{ fontSize: 36 }}>💬</Text>
        <Text
          className="text-sm text-center"
          style={{ color: theme.colors.textMuted }}
        >
          {emptyMessage}
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1"
      contentContainerStyle={{
        width: "100%",
        maxWidth: ANCHO_DEL_CHAT,
        alignSelf: "center",
        paddingVertical: 4,
      }}
    >
      {conversations.map((conv) => {
        const conNuevos = conv.noLeidos > 0 && !conv.silenciado;
        return (
          <Pressable
            key={conv.id}
            onPress={() => onSelect(conv)}
            className="flex-row items-center gap-3 px-4 py-3 active:opacity-70"
            style={{
              borderBottomWidth: 1,
              borderBottomColor: theme.colors.borderLight,
            }}
          >
            <View
              className="w-12 h-12 rounded-full items-center justify-center"
              style={{
                backgroundColor:
                  conv.tipo === "grupo"
                    ? theme.colors.chatAcentoSuave
                    : theme.colors.primaryLight,
              }}
            >
              {/* Un canal sin emoji salía como un círculo vacío. */}
              <Text style={{ fontSize: 22 }}>
                {conv.avatarEmoji || (conv.tipo === "grupo" ? "👥" : "💬")}
              </Text>
            </View>

            <View className="flex-1" style={{ minWidth: 0 }}>
              <View className="flex-row items-center gap-2">
                <View
                  className="flex-1 flex-row items-center gap-1.5"
                  style={{ minWidth: 0 }}
                >
                  <Text
                    className="text-base"
                    numberOfLines={1}
                    ellipsizeMode="tail"
                    style={{
                      flexShrink: 1,
                      fontWeight: conNuevos ? "700" : "600",
                      // Silenciada, en gris: el interruptor tiene que verse
                      // en la lista, si no se pulsa y no pasa nada a la vista.
                      color: conv.silenciado
                        ? theme.colors.textMuted
                        : theme.colors.text,
                    }}
                  >
                    {conv.silenciado ? "🔕 " : ""}
                    {conv.nombre}
                  </Text>
                  {conv.tipo === "grupo" && (
                    <View
                      className="rounded-full px-1.5 py-0.5"
                      style={{ backgroundColor: theme.colors.chatAcentoSuave }}
                    >
                      <Text
                        className="text-[10px] font-medium"
                        style={{ color: theme.colors.secondaryDark }}
                      >
                        Grupo
                      </Text>
                    </View>
                  )}
                </View>
                <Text
                  className="text-xs"
                  style={{
                    color: conNuevos
                      ? theme.colors.primaryDark
                      : theme.colors.textMuted,
                    flexShrink: 0,
                  }}
                  numberOfLines={1}
                >
                  {cuandoFue(conv.ultimaFecha, conv.ultimaHora)}
                </Text>
              </View>

              <View className="flex-row items-center gap-2 mt-0.5">
                <Text
                  className="text-sm flex-1"
                  style={{
                    color: conv.ultimoMensaje
                      ? theme.colors.textSecondary
                      : theme.colors.textMuted,
                    fontStyle: conv.ultimoMensaje ? "normal" : "italic",
                  }}
                  numberOfLines={1}
                >
                  {conv.ultimoMensaje || "Sin mensajes todavía"}
                </Text>
                {conv.noLeidos > 0 && !conv.silenciado && (
                  <View
                    className="rounded-full items-center justify-center px-1.5"
                    style={{
                      backgroundColor: theme.colors.primary,
                      minWidth: 20,
                      height: 20,
                    }}
                  >
                    <Text
                      className="text-[11px] font-bold"
                      style={{ color: theme.colors.text }}
                    >
                      {conv.noLeidos}
                    </Text>
                  </View>
                )}
                {onSilenciar && (
                  <Pressable
                    accessibilityRole="switch"
                    accessibilityLabel={
                      conv.silenciado
                        ? `Volver a oír ${conv.nombre}`
                        : `Silenciar ${conv.nombre}`
                    }
                    /*
                      Los dos: react-native-web no traduce `accessibilityState`
                      a ningún atributo del DOM (documentado en `Checkbox.tsx`).
                    */
                    aria-checked={conv.silenciado ?? false}
                    accessibilityState={{ checked: conv.silenciado ?? false }}
                    onPress={() => onSilenciar(conv)}
                    hitSlop={8}
                  >
                    <Ionicons
                      name={
                        conv.silenciado
                          ? "notifications-off"
                          : "notifications-outline"
                      }
                      size={17}
                      color={
                        conv.silenciado
                          ? theme.colors.textSecondary
                          : theme.colors.textMuted
                      }
                    />
                  </Pressable>
                )}
              </View>
            </View>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
