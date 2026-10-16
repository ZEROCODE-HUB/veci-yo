import { theme } from "@/config";
import React from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { Cargando } from "@/shared/components";
import { useNavegacion } from "@/shared/hooks";
import { navigateToRoute } from "@/navigation/helpers/navigation.helpers";
import { formatDateTime } from "@/shared/utils";
import { historialSos, type AlarmaDelHistorial } from "../services/sos.repo";

const ESTADO: Record<NonNullable<AlarmaDelHistorial["cierre"]> | "abierta", { texto: string; fondo: string; color: string }> = {
  abierta: { texto: "Abierta", fondo: theme.colors.dangerLight, color: theme.colors.dangerDark },
  atendida: { texto: "Atendida", fondo: theme.colors.successLight, color: theme.colors.success },
  cancelada: { texto: "Cancelada", fondo: theme.colors.borderLight, color: theme.colors.textSecondary },
  sin_respuesta: { texto: "Sin respuesta", fondo: theme.colors.warningLight, color: theme.colors.iconAmberDark },
};

/**
 * El historial de S.O.S. (15/10/2026, hueco 15).
 *
 * No había ninguno: una alarma sonaba, se cerraba y no quedaba dónde mirarla.
 * La portería y la administración ven las de su edificio; cada quien, las
 * suyas. Lo decide la base (`historial_sos`). Desde una atendida se llega a
 * la incidencia que dejó la portería.
 */
export function HistorialSosScreen() {
  const navigation = useNavegacion();
  const { data: alarmas = [], isLoading } = useQuery({
    queryKey: ["sos", "historial"],
    queryFn: () => historialSos(100),
  });

  if (isLoading) return <Cargando texto="el historial" />;

  return (
    <ScrollView className="flex-1 bg-gray-50" contentContainerStyle={{ padding: 16, gap: 12 }}>
      {alarmas.length === 0 ? (
        <Text className="text-sm text-gray-500 text-center mt-8">
          Todavía no hay ningún S.O.S. en tu historial.
        </Text>
      ) : null}
      {alarmas.map((a) => {
        const estado = ESTADO[a.cierre ?? "abierta"];
        return (
          <View key={a.id} className="bg-white rounded-xl p-4 gap-1.5" style={{ boxShadow: theme.shadows.card }}>
            <View className="flex-row items-center justify-between">
              <Text className="text-sm font-bold text-gray-900">
                {formatDateTime(new Date(a.activadaEn))}
              </Text>
              <View className="px-2 py-0.5 rounded-full" style={{ backgroundColor: estado.fondo }}>
                <Text className="text-xs font-semibold" style={{ color: estado.color }}>
                  {estado.texto}
                </Text>
              </View>
            </View>
            <Text className="text-sm text-gray-700">
              {[a.esMia ? "Lo activaste tú" : a.quien, a.unidad ? `Vivienda ${a.unidad}` : null]
                .filter(Boolean)
                .join(" · ")}
            </Text>
            {a.cerradaPor ? (
              <Text className="text-xs text-gray-500">Lo cerró: {a.cerradaPor}</Text>
            ) : null}
            {a.incidenciaId ? (
              <Pressable
                accessibilityRole="link"
                onPress={() => navigateToRoute(navigation, "ReclamoDetalle", { id: a.incidenciaId })}
              >
                <Text className="text-sm font-semibold" style={{ color: theme.colors.primary }}>
                  Ver la incidencia ›
                </Text>
              </Pressable>
            ) : null}
          </View>
        );
      })}
    </ScrollView>
  );
}
