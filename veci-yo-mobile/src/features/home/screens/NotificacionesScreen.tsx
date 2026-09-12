import React from "react";
import { View, Text, FlatList } from "react-native";
import { ScreenLayout } from "@/shared/layouts";
import { NotificacionCard } from "../components/notificaciones";
import { useNotificaciones } from "../hooks/useNotificaciones";

const ROL_LABELS: Record<string, string> = {
  guardia: "Seguridad",
  administrador: "Administrador",
};

export function NotificacionesScreen() {
  const { rol, notificaciones, marcarLeida } = useNotificaciones();
  const label = ROL_LABELS[rol] || "Residente";

  return (
    <ScreenLayout withScroll={false}>
      <View className="flex-row items-center gap-2 mb-3">
        <Text className="text-sm text-gray-500">Mostrando novedades para:</Text>
        <View className="px-3 py-1 rounded-full" style={{ backgroundColor: "#FFF8E1" }}>
          <Text className="text-xs font-semibold" style={{ color: "#92400E" }}>
            {label}
          </Text>
        </View>
      </View>
      <FlatList
        data={notificaciones}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={{ gap: 10 }}
        renderItem={({ item }) => (
          <NotificacionCard
            notificacion={item}
            onPress={(notificacion) => {
              if (!notificacion.leida) marcarLeida(notificacion.id);
            }}
          />
        )}
        ListEmptyComponent={
          <Text className="text-center text-gray-400 py-8">
            No tienes notificaciones por el momento
          </Text>
        }
      />
    </ScreenLayout>
  );
}

