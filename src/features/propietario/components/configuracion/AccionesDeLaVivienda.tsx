import React from "react";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "@/config";
import { ESTILO_DE_TARJETA } from "./gruposDeResidentes";

interface Props {
  puedeConfigurarElAlojamiento: boolean;
  puedeGestionarLaVivienda: boolean;
  onFuncionalidades: () => void;
  onContratos: () => void;
  onServicios: () => void;
}

/**
 * Lo demás de la vivienda, como una lista de filas con su flecha (25/11/2026,
 * el cliente: «hazlo sencillo»). Eran cuatro botones grandes, dos amarillos y
 * dos blancos, uno de ellos con «Configuración de funcionalidad: Huéspedes
 * Temporales» apretado en una línea. «Invitar» ya no está aquí: va junto a la
 * gente de la vivienda, que es donde se busca.
 */
export function AccionesDeLaVivienda({
  puedeConfigurarElAlojamiento,
  puedeGestionarLaVivienda,
  onFuncionalidades,
  onContratos,
  onServicios,
}: Props) {
  const filas: { texto: string; detalle: string; icono: keyof typeof Ionicons.glyphMap; ir: () => void }[] = [
    ...(puedeConfigurarElAlojamiento
      ? [
          {
            texto: "Renta corta (huéspedes)",
            detalle: "Alquilar por noches: reglas, aforo, wifi y llegada",
            icono: "bed-outline" as const,
            ir: onFuncionalidades,
          },
        ]
      : []),
    /*
      El historial de contratos y los servicios contratados --luz, agua,
      internet-- tenían su pantalla terminada y **no se podían alcanzar**. El
      KT los lista entre lo que hace el propietario.
    */
    ...(puedeGestionarLaVivienda
      ? [
          {
            texto: "Contratos de arrendamiento",
            detalle: "Los contratos de quien alquila la vivienda",
            icono: "document-text-outline" as const,
            ir: onContratos,
          },
          {
            texto: "Servicios contratados",
            detalle: "Luz, agua, internet y sus recordatorios",
            icono: "flash-outline" as const,
            ir: onServicios,
          },
        ]
      : []),
  ];
  if (filas.length === 0) return null;

  return (
    <View className="gap-2">
      <Text className="text-base font-bold text-gray-900 mt-2">Más de tu vivienda</Text>
      <View className="rounded-2xl overflow-hidden" style={ESTILO_DE_TARJETA}>
        {filas.map((f, i) => (
          <Pressable
            key={f.texto}
            onPress={f.ir}
            accessibilityRole="button"
            accessibilityLabel={f.texto}
            className="flex-row items-center gap-3 px-4 py-3.5 active:opacity-70"
            style={i > 0 ? { borderTopWidth: 1, borderTopColor: theme.colors.borderLight } : undefined}
          >
            <Ionicons name={f.icono} size={22} color={theme.colors.primaryDark} />
            <View className="flex-1">
              <Text className="text-sm font-semibold text-gray-900">{f.texto}</Text>
              <Text className="text-xs text-gray-500">{f.detalle}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.colors.textSecondary} />
          </Pressable>
        ))}
      </View>
    </View>
  );
}
