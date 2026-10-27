import React from "react";
import { Image, Pressable, Text, View } from "react-native";
import { theme } from "@/config";
import { TIPO_LABELS } from "../../constants";
import { TIPO_VISITA_ASSETS } from "../tipoVisitaAssets";
import type { VisitaItem } from "@/shared/types";

type Tipo = VisitaItem["tipo"];

interface Props {
  tipos: Tipo[];
  /** Si la vivienda tiene renta corta; sin ella, «Huésped temporal» va con candado. */
  huespedDisponible: boolean;
  onElegir: (tipo: Tipo) => void;
}

/**
 * Los botones para registrar una visita de cada tipo, arriba del historial.
 *
 * Salió de `VisitasHistorialScreen` el 26/10/2026; hace lo mismo que hacía allí.
 */
export function AccesosRapidosDeVisita({ tipos, huespedDisponible, onElegir }: Props) {
  return (
    <View className="flex-row flex-wrap gap-2">
      {tipos.map((tipo) => {
        const bloqueado = tipo === "huesped-temporal" && !huespedDisponible;
        return (
          <Pressable
            key={tipo}
            /*
              Atenuada significa «hace falta un paquete de huespedes», y eso era
              invisible para quien no ve la opacidad. El control si responde:
              abre el modal para comprarlo.
            */
            accessibilityHint={
              bloqueado ? "Hace falta un paquete de huéspedes temporales" : undefined
            }
            onPress={() => onElegir(tipo)}
            className="flex-row items-center gap-2 flex-1"
            style={{
              minWidth: "45%",
              paddingVertical: 10,
              paddingHorizontal: 12,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: theme.colors.border,
              backgroundColor: theme.colors.bgCard,
              shadowColor: theme.colors.shadow,
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.08,
              shadowRadius: 8,
              elevation: 3,
              opacity: bloqueado ? 0.6 : 1,
            }}
          >
            <View
              className="w-8 h-8 rounded-full items-center justify-center"
              style={{ backgroundColor: theme.colors.borderLight }}
            >
              <Image
                source={TIPO_VISITA_ASSETS[tipo] || TIPO_VISITA_ASSETS.amigos}
                style={{ width: 32, height: 32, borderRadius: 9999 }}
                resizeMode="cover"
              />
            </View>
            <Text className="text-xs font-medium text-gray-900 flex-1" numberOfLines={2}>
              {TIPO_LABELS[tipo] || tipo}
              {bloqueado ? " 🔒" : ""}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
