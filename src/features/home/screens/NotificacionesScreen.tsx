import { theme } from "@/config";
import React from "react";
import { Text, FlatList, Pressable } from "react-native";
import { ScreenLayout } from "@/shared/layouts";
import { NotificacionCard } from "../components/notificaciones";
import { useNotificaciones } from "../hooks/useNotificaciones";
import { useNavegacion } from "@/shared/hooks";

export function NotificacionesScreen() {
  const navigation = useNavegacion();
  const { notificaciones, marcarLeida, marcarTodasLeidas, isLoading } =
    useNotificaciones();
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
              /*
                Y lleva al sitio. Hasta hoy tocar un aviso solo lo marcaba
                leido: avisar de algo y dejar a la persona buscandolo es media
                funcion, y con el chat se nota mas que con nada --«te
                escribieron» sin decir donde es una invitacion a cerrar la
                aplicacion--.

                Solo las conversaciones, que es lo que se acaba de conectar.
                El resto de los motivos lleva su `entidad_id` desde septiembre
                y nadie lo usa; cada uno necesita saber a que pantalla va, y
                eso se hace cuando se recorra.
              */
              if (
                notificacion.entidadTipo === "conversacion" &&
                notificacion.entidadId
              ) {
                navigation.navigate("ChatConversacion", {
                  conversationId: notificacion.entidadId,
                });
              }
            }}
          />
        )}
        /*
          Mientras carga no se dice que no hay nada. Son dos situaciones
          distintas --«todavia no lo se» y «lo se, y no hay»-- y la segunda es
          una afirmacion: quien la lee deja de esperar y se va.
        */
        ListEmptyComponent={
          <Text className="text-center text-gray-400 py-8">
            {isLoading
              ? "Buscando tus notificaciones..."
              : "No tienes notificaciones por el momento"}
          </Text>
        }
      />
    </ScreenLayout>
  );
}

