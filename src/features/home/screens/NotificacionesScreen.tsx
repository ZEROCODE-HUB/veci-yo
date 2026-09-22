import { theme } from "@/config";
import React from "react";
import { View, Text, FlatList, Pressable } from "react-native";
import { ScreenLayout } from "@/shared/layouts";
import { NotificacionCard } from "../components/notificaciones";
import { useNotificaciones } from "../hooks/useNotificaciones";

export function NotificacionesScreen() {
  const { notificaciones, marcarLeida, marcarTodasLeidas } = useNotificaciones();
  const haySinLeer = notificaciones.some((n) => !n.leida);

  return (
    <ScreenLayout withScroll={false}>
      {haySinLeer && (
        <Pressable
          onPress={marcarTodasLeidas}
          className="self-end px-3 py-1 rounded-full mb-3"
          style={{ backgroundColor: theme.colors.primaryLight }}
        >
          <Text className="text-xs font-semibold" style={{ color: theme.colors.iconAmberDark }}>
            Marcar todas como leídas
          </Text>
        </Pressable>
      )}
      <FlatList
        data={notificaciones}
        keyExtractor={(item) => item.id}
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

