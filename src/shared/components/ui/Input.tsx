import { theme } from "@/config";
import React, { useState } from "react";
import { View, TextInput, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { EtiquetaDelCampo } from "./EtiquetaDelCampo";

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
  /**
   * Solo deja cifras: lo demás se quita al escribir o pegar, y abre el
   * teclado numérico. Para pisos, cantidades, días o teléfonos; no para
   * montos (llevan separadores) ni documentos (pueden llevar letras).
   */
  soloCifras?: boolean;
  /**
   * Para nombres y apellidos: solo letras (con tildes y ñ), espacios,
   * apóstrofos, guiones y puntos. Se podían poner números (QA 23/10/2026).
   */
  soloLetras?: boolean;
}

const filtrarCifras = (texto: string) => texto.replace(/[^0-9]/g, "");
const filtrarNombre = (texto: string) => texto.replace(/[^\p{L}\p{M}\s'’.\-]/gu, "");

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
  soloCifras = false,
  soloLetras = false,
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
      {label ? <EtiquetaDelCampo label={label} /> : null}
      <View className="relative">
        <TextInput
          value={value}
          onChangeText={
            soloCifras
              ? (texto) => onChangeText(filtrarCifras(texto))
              : soloLetras
                ? (texto) => onChangeText(filtrarNombre(texto))
                : onChangeText
          }
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
            soloCifras || type === "numeric"
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
            accessibilityRole="button"
            accessibilityLabel={
              showPassword ? "Ocultar la contraseña" : "Mostrar la contraseña"
            }
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
