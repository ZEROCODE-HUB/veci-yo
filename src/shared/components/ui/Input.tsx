import { theme } from "@/config";
import React, { useState } from "react";
import { View, TextInput, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface InputProps {
  label?: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  multiline?: boolean;
  type?: "text" | "password" | "email" | "numeric";
  rows?: number;
  error?: string;
  showEditIcon?: boolean;
  onFocus?: () => void;
  onBlur?: () => void;
  style?: object;
  editable?: boolean;
}

export function Input({
  label,
  value,
  onChangeText,
  placeholder,
  multiline = false,
  type = "text",
  rows = 3,
  error = "",
  showEditIcon = true,
  onFocus,
  onBlur,
  style,
  editable = true,
}: InputProps) {
  const [focused, setFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const isPassword = type === "password";
  const secureTextEntry = isPassword && !showPassword;

  const borderColor = error
    ? theme.colors.danger
    : focused
      ? theme.colors.primary
      : theme.colors.border;

  return (
    <View style={style}>
      {label && (
        <Text className="text-sm text-gray-500 mb-1.5 font-medium">
          {label}
        </Text>
      )}
      <View className="relative">
        <TextInput
          value={value}
          onChangeText={onChangeText}
          /*
            La etiqueta se pinta arriba como un `<Text>` suelto y en el DOM no
            queda unida al campo: sin esto, el arbol de accesibilidad da siete
            campos sin nombre en la pantalla de Arquitectura --comprobado en el
            navegador-- y un lector de pantalla lee "campo de texto" siete
            veces. `Input` lo usa media aplicacion, asi que es de una linea y
            vale para todas.
          */
          accessibilityLabel={label}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.textMuted}
          multiline={multiline}
          numberOfLines={multiline ? rows : 1}
          keyboardType={
            type === "numeric"
              ? "numeric"
              : type === "email"
                ? "email-address"
                : "default"
          }
          secureTextEntry={secureTextEntry}
          editable={editable}
          className="w-full bg-white rounded-2xl px-4 py-3.5 text-base text-gray-900 border"
          style={{
            borderColor,
            textAlignVertical: multiline ? "top" : "center",
          }}
          onFocus={() => {
            setFocused(true);
            onFocus?.();
          }}
          onBlur={() => {
            setFocused(false);
            onBlur?.();
          }}
        />
        {isPassword ? (
          <Pressable
            onPress={() => setShowPassword(!showPassword)}
            className="absolute right-3.5 top-1/2 -translate-y-1/2"
          >
            <Ionicons
              name={showPassword ? "eye-off" : "eye"}
              size={18}
              color={theme.colors.textMuted}
            />
          </Pressable>
        ) : showEditIcon ? (
          <View
            className="absolute right-3.5 pointer-events-none"
            style={{
              top: multiline ? 14 : "50%",
              transform: multiline ? undefined : [{ translateY: -8 }],
            }}
          >
            <Ionicons
              name="create-outline"
              size={16}
              color={theme.colors.textMuted}
            />
          </View>
        ) : null}
      </View>
      {error ? (
        <Text className="text-xs text-danger mt-1.5 font-medium">{error}</Text>
      ) : null}
    </View>
  );
}
