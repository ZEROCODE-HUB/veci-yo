import React, { useState } from "react";
import { Linking, Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "@/config";
import { useUIStore } from "@/stores";
import { mensajeDeError } from "@/shared/utils";
import { urlDocumentoDelReglamento } from "../services/zonas.repo";

interface DocumentoDelReglamentoProps {
  ruta?: string | null;
  nombre?: string | null;
}

/**
 * Abre el documento del reglamento de la zona, si la administración subió uno
 * (Para Claude 201, 01/11/2026). El bucket es privado: se abre con un enlace
 * temporal. Sin documento no pinta nada.
 */
export function DocumentoDelReglamento({ ruta, nombre }: DocumentoDelReglamentoProps) {
  const addToast = useUIStore((s) => s.addToast);
  const [abriendo, setAbriendo] = useState(false);
  if (!ruta) return null;

  const abrir = async () => {
    setAbriendo(true);
    try {
      await Linking.openURL(await urlDocumentoDelReglamento(ruta));
    } catch (e) {
      addToast(mensajeDeError(e, "No se pudo abrir el reglamento"), "error");
    } finally {
      setAbriendo(false);
    }
  };

  return (
    <Pressable
      onPress={() => void abrir()}
      disabled={abriendo}
      accessibilityRole="button"
      accessibilityLabel="Abrir el documento del reglamento"
      className="flex-row items-center gap-2 rounded-xl border border-gray-200 px-3 py-2.5 active:opacity-70"
      style={{ opacity: abriendo ? 0.5 : 1 }}
    >
      <Ionicons name="document-text-outline" size={18} color={theme.colors.primary} />
      <View className="flex-1">
        <Text className="text-sm font-semibold text-primary">
          {abriendo ? "Abriendo…" : "Abrir el documento del reglamento"}
        </Text>
        {nombre ? (
          <Text className="text-xs text-gray-500" numberOfLines={1}>
            {nombre}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}
