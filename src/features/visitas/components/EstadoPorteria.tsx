import { theme } from "@/config";
import React from "react";
import { Text, View } from "react-native";
import type { VisitaItem } from "@/shared/types";
import { estadoParaPorteria } from "../helpers/estadoParaPorteria";

/** Lo que falta de una estancia, en palabras, para la portería (16/10/2026). */
export function EstadoPorteria({ item }: { item: VisitaItem }) {
  const estado = estadoParaPorteria(item);
  const colores = {
    bien: { fondo: theme.colors.successLight, texto: theme.colors.badgeGreenText },
    espera: { fondo: theme.colors.iconAmberBg, texto: theme.colors.iconAmberDark },
    mal: { fondo: theme.colors.badgeRedBg, texto: theme.colors.badgeRedText },
  }[estado.tono];
  return (
    <View className="mt-2 py-1.5 px-2.5 rounded-full" style={{ backgroundColor: colores.fondo }}>
      <Text className="text-xs font-semibold text-center" style={{ color: colores.texto }}>
        {estado.texto}
      </Text>
    </View>
  );
}
