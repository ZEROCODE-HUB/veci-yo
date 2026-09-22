import { theme } from "@/config";
import React from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import { truncate } from "../../helpers/chatHelpers";
import type { Conversation } from "@/shared/types";

interface ChatConversationListProps {
  conversations: Conversation[];
  onSelect: (conv: Conversation) => void;
  emptyMessage: string;
}

export function ChatConversationList({
  conversations,
  onSelect,
  emptyMessage,
}: ChatConversationListProps) {
  if (conversations.length === 0) {
    return (
      <Text className="text-sm text-center py-10" style={{ color: theme.colors.textMuted }}>
        {emptyMessage}
      </Text>
    );
  }

  return (
    <ScrollView className="flex-1" contentContainerClassName="px-4 py-2">
      {conversations.map((conv) => (
        <Pressable
          key={conv.id}
          onPress={() => onSelect(conv)}
          className="flex-row items-center gap-3 py-3"
          style={{
            borderBottomWidth: 1,
            borderBottomColor: theme.colors.borderLight,
            backgroundColor:
              conv.tipo === "grupo" ? "rgba(91,155,213,0.06)" : "transparent",
          }}
        >
          <View
            className="w-12 h-12 rounded-full items-center justify-center"
            style={{
              backgroundColor: conv.tipo === "grupo" ? "#E8F4FD" : "#5B9BD5",
            }}
          >
            <Text style={{ fontSize: 22 }}>{conv.avatarEmoji}</Text>
          </View>
          <View className="flex-1" style={{ minWidth: 0 }}>
            <View
              className="flex-row items-center gap-2"
              style={{ minWidth: 0 }}
            >
              <View
                className="flex-1 flex-row items-center gap-1.5"
                style={{ minWidth: 0 }}
              >
                <Text
                  className="flex-1 text-base font-bold text-gray-900"
                  ellipsizeMode="tail"
                >
                  {conv.nombre}
                </Text>
                {conv.tipo === "grupo" && (
                  <View
                    className="rounded-full px-1.5 py-0.5"
                    style={{ backgroundColor: theme.colors.primaryLight }}
                  >
                    <Text
                      className="text-[10px] font-medium"
                      style={{ color: theme.colors.primary }}
                    >
                      Grupo
                    </Text>
                  </View>
                )}
              </View>
              <Text
                className="text-xs"
                style={{ color: theme.colors.textMuted, flexShrink: 0 }}
                numberOfLines={1}
              >
                {conv.ultimaFecha} {conv.ultimaHora}
              </Text>
            </View>
            <View className="flex-row justify-between items-center mt-0.5">
              <Text
                className="text-sm flex-1"
                style={{ color: theme.colors.textSecondary }}
                numberOfLines={1}
              >
                {truncate(conv.ultimoMensaje, 50)}
              </Text>
              {conv.noLeidos > 0 && (
                <View
                  className="rounded-full items-center justify-center ml-2"
                  style={{
                    backgroundColor: theme.colors.primary,
                    minWidth: 20,
                    height: 20,
                  }}
                >
                  <Text className="text-[11px] font-bold text-white">
                    {conv.noLeidos}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </Pressable>
      ))}
    </ScrollView>
  );
}
