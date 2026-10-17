import { theme } from "@/config";
import React from "react";
import { View, TextInput, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ANCHO_DEL_CHAT } from "./ChatThread";

interface ChatComposerProps {
  value: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
}

export function ChatComposer({
  value,
  onChangeText,
  onSend,
}: ChatComposerProps) {
  const vacio = !value.trim();
  return (
    <View
      className="px-3 py-2.5"
      style={{
        backgroundColor: theme.colors.bgCard,
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
      }}
    >
      <View
        className="flex-row items-center gap-2"
        style={{ width: "100%", maxWidth: ANCHO_DEL_CHAT, alignSelf: "center" }}
      >
        <TextInput
          value={value}
          onChangeText={onChangeText}
          onSubmitEditing={onSend}
          placeholder="Escribe un mensaje"
          placeholderTextColor={theme.colors.textMuted}
          className="flex-1 text-base text-gray-900 rounded-full px-4"
          style={{
            backgroundColor: theme.colors.bgMuted,
            borderWidth: 1,
            borderColor: theme.colors.border,
            paddingVertical: 10,
          }}
        />
        <Pressable
          onPress={onSend}
          disabled={vacio}
          accessibilityRole="button"
          accessibilityLabel="Enviar mensaje"
          accessibilityState={{ disabled: vacio }}
          aria-disabled={vacio}
          className="w-11 h-11 rounded-full items-center justify-center"
          style={{
            backgroundColor: vacio ? theme.colors.border : theme.colors.primary,
          }}
        >
          <Ionicons
            name="send"
            size={18}
            color={vacio ? theme.colors.textMuted : theme.colors.textInverse}
          />
        </Pressable>
      </View>
    </View>
  );
}
