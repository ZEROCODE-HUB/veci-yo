import React from "react";
import { Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { theme } from "@/config";
import { Button } from "@/shared/components";
import { navigateToRoute } from "@/navigation/helpers/navigation.helpers";
import { useNavegacion } from "@/shared/hooks";
import { obtenerAvisosDeEstancia } from "../services/notificaciones.repo";

/**
 * Lo último que pasó con los huéspedes del anfitrión (14/10/2026): entradas,
 * salidas parciales, la salida del último y lo que pide su aprobación. Se
 * apagan uno por uno en Perfil › Avisos. Solo sale si hay alguno.
 */
export function AvisosDeMisHuespedes() {
  const navigation = useNavegacion();
  const { data: avisos = [] } = useQuery({
    queryKey: ["home", "avisos-estancia"],
    queryFn: () => obtenerAvisosDeEstancia(5),
    refetchInterval: 60_000,
  });

  if (avisos.length === 0) return null;

  return (
    <View className="bg-white rounded-xl p-4 gap-2" style={{ boxShadow: theme.shadows.card }}>
      <Text className="text-base font-bold text-gray-900">Tus huéspedes</Text>
      {avisos.map((aviso, i) => (
        <View
          key={aviso.id}
          className="flex-row gap-2.5 py-2"
          style={{
            borderBottomWidth: i === avisos.length - 1 ? 0 : 1,
            borderBottomColor: theme.colors.borderLight,
          }}
        >
          <Text style={{ fontSize: 20 }}>{aviso.emoji}</Text>
          <View className="flex-1">
            <Text className={`text-sm text-gray-900 ${aviso.leida ? "" : "font-semibold"}`}>
              {aviso.titulo}
            </Text>
            <Text className="text-xs text-gray-600">{aviso.mensaje}</Text>
            <Text className="text-2xs text-gray-400">
              {aviso.fecha} · {aviso.hora}
            </Text>
          </View>
        </View>
      ))}
      <Button variant="secondary" fullWidth onPress={() => navigateToRoute(navigation, "Notificaciones")}>
        Ver todas
      </Button>
    </View>
  );
}
