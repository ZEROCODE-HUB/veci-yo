import { theme } from "@/config";
import React from "react";
import { View, TextInput, Pressable, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ANCHO_DEL_CHAT } from "./ChatThread";
import type { ArchivoElegido } from "@/shared/services/archivos";

interface ChatComposerProps {
  value: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  /**
   * Una foto o un PDF para mandar con el mensaje (hueco 8, 21/10/2026): por
   * ejemplo, el comprobante de pago de una zona.
   */
  adjunto?: ArchivoElegido | null;
  onAdjuntar?: () => void;
  onQuitarAdjunto?: () => void;
  enviando?: boolean;
}

export function ChatComposer({
  value,
  onChangeText,
  onSend,
  adjunto = null,
  onAdjuntar,
  onQuitarAdjunto,
  enviando = false,
}: ChatComposerProps) {
  const vacio = (!value.trim() && !adjunto) || enviando;
  return (
    <View
      className="px-3 py-2.5"
      style={{
        backgroundColor: theme.colors.bgCard,
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
      }}
    >
      {adjunto ? (
        <View
          className="flex-row items-center gap-2 mb-2 rounded-xl px-3 py-2"
          style={{
            width: "100%",
            maxWidth: ANCHO_DEL_CHAT,
            alignSelf: "center",
            backgroundColor: theme.colors.bgMuted,
          }}
        >
          <Ionicons name="attach" size={16} color={theme.colors.textSecondary} />
          <Text className="flex-1 text-sm text-gray-900" numberOfLines={1}>
            {adjunto.nombre}
          </Text>
          <Pressable
            onPress={onQuitarAdjunto}
            accessibilityRole="button"
            accessibilityLabel="Quitar el archivo"
            hitSlop={8}
          >
            <Ionicons name="close" size={18} color={theme.colors.textMuted} />
          </Pressable>
        </View>
      ) : null}
      <View
        className="flex-row items-center gap-2"
        style={{ width: "100%", maxWidth: ANCHO_DEL_CHAT, alignSelf: "center" }}
      >
        {onAdjuntar ? (
          <Pressable
            onPress={onAdjuntar}
            accessibilityRole="button"
            accessibilityLabel="Adjuntar una foto o un PDF"
            className="w-11 h-11 rounded-full items-center justify-center"
            style={{ backgroundColor: theme.colors.bgMuted }}
          >
            <Ionicons name="attach" size={20} color={theme.colors.textSecondary} />
          </Pressable>
        ) : null}
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
          accessibilityState={{ disabled: vacio, busy: enviando }}
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
