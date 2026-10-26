import { theme } from "@/config";
import React, { useState } from "react";
import { Linking, Pressable, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useUIStore } from "@/stores";
import { mensajeDeError } from "@/shared/utils/error.util";
import { abrirAdjuntoDelChat } from "../../services/chat.repo";

/**
 * El archivo de un mensaje (hueco 8): se abre con un enlace temporal, porque
 * el bucket es privado --un comprobante lleva datos bancarios--.
 */
export function AdjuntoDelMensaje({
  adjunto,
}: {
  adjunto: { ruta: string; nombre: string; tipo: string };
}) {
  const addToast = useUIStore((s) => s.addToast);
  const [abriendo, setAbriendo] = useState(false);
  const esPdf = adjunto.tipo === "application/pdf";

  return (
    <Pressable
      onPress={async () => {
        setAbriendo(true);
        try {
          await Linking.openURL(await abrirAdjuntoDelChat(adjunto.ruta));
        } catch (e) {
          addToast(mensajeDeError(e, "No se pudo abrir el archivo"), "error");
        } finally {
          setAbriendo(false);
        }
      }}
      accessibilityRole="button"
      accessibilityLabel={`Abrir ${adjunto.nombre}`}
      accessibilityState={{ busy: abriendo }}
      className="flex-row items-center gap-2 rounded-lg px-2.5 py-2 mb-1 active:opacity-70"
      style={{ backgroundColor: theme.colors.bgMuted }}
    >
      <Ionicons
        name={esPdf ? "document-text-outline" : "image-outline"}
        size={18}
        color={theme.colors.textSecondary}
      />
      <Text className="shrink text-sm font-semibold text-gray-900" numberOfLines={1}>
        {abriendo ? "Abriendo…" : adjunto.nombre}
      </Text>
    </Pressable>
  );
}
