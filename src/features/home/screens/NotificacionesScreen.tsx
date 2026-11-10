import { theme } from "@/config";
import React, { useState } from "react";
import { Text, FlatList, Pressable, View } from "react-native";
import { ScreenLayout } from "@/shared/layouts";
import { cambiarDeRol } from "@/shared/layouts/SelectorDeRol";
import { Button, Modal } from "@/shared/components";
import { useAuthStore, useUbicacionStore } from "@/stores";
import { NotificacionCard } from "../components/notificaciones";
import { useNotificaciones } from "../hooks/useNotificaciones";
import { useElegirVivienda, useNavegacion } from "@/shared/hooks";
import { destinoDeAviso } from "../helpers/destinoDeAviso";
import {
  aQuienPerteneceElAviso,
  hayQueCambiarParaVerlo,
  type PertenenciaDelAviso,
} from "../helpers/aQuienPerteneceElAviso";
import { navigateToRoute } from "@/navigation/helpers/navigation.helpers";
import type { Notificacion } from "../types/home";

export function NotificacionesScreen() {
  const navigation = useNavegacion();
  const { notificaciones, marcarLeida, marcarTodasLeidas, isLoading } =
    useNotificaciones();
  const haySinLeer = notificaciones.some((n) => !n.leida);
  const rolActivo = useAuthStore((s) => s.rolActivo);
  const roles = useAuthStore((s) => s.rolesDisponibles);
  const ubicaciones = useUbicacionStore((s) => s.ubicaciones);
  const elegirVivienda = useElegirVivienda();
  /** El aviso que pide cambiar de rol o de vivienda antes de abrirse. */
  const [porCambiar, setPorCambiar] = useState<{
    aviso: Notificacion;
    pertenece: PertenenciaDelAviso;
  } | null>(null);

  /*
    Y lleva al sitio: cada motivo a su pantalla (hueco 26, 15/10/2026).
  */
  const abrir = (aviso: Notificacion) => {
    const destino = destinoDeAviso(aviso);
    if (destino) navigateToRoute(navigation, destino.pantalla, destino.parametros);
  };

  /*
    Si el aviso es de otro rol o de otra vivienda (10/11/2026), se pregunta
    antes: abrirlo con el rol de ahora llevaba a la pantalla equivocada --la
    visita del 102 a las visitas de la administración--.
  */
  const cambiarYAbrir = () => {
    if (!porCambiar) return;
    const { aviso, pertenece } = porCambiar;
    setPorCambiar(null);
    const vivienda = pertenece.ubicacionId;
    if (pertenece.rol !== rolActivo) {
      cambiarDeRol(
        pertenece.rol,
        vivienda !== undefined ? () => elegirVivienda(vivienda) : undefined,
        () => abrir(aviso),
      );
    } else {
      if (vivienda !== undefined) elegirVivienda(vivienda);
      abrir(aviso);
    }
  };

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
        renderItem={({ item }) => {
          const pertenece = aQuienPerteneceElAviso(item, ubicaciones, roles);
          return (
            <NotificacionCard
              notificacion={item}
              deDonde={pertenece?.etiqueta}
              onPress={(notificacion) => {
                if (!notificacion.leida) marcarLeida(notificacion.id);
                if (
                  pertenece &&
                  destinoDeAviso(notificacion) &&
                  hayQueCambiarParaVerlo(pertenece, rolActivo, ubicaciones)
                ) {
                  setPorCambiar({ aviso: notificacion, pertenece });
                  return;
                }
                abrir(notificacion);
              }}
            />
          );
        }}
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
      <Modal
        visible={Boolean(porCambiar)}
        onClose={() => setPorCambiar(null)}
        title={porCambiar?.pertenece.rol === rolActivo ? "Este aviso es de otra vivienda" : "Este aviso es de otro rol"}
      >
        <View className="gap-3">
          <Text className="text-sm text-gray-700">
            {porCambiar
              ? `Es de ${porCambiar.pertenece.etiqueta}. Para verlo, cambiarás a ${porCambiar.pertenece.rol === rolActivo ? "esa vivienda" : "ese rol"}.`
              : ""}
          </Text>
          <Button onPress={cambiarYAbrir} fullWidth>
            Cambiar y ver
          </Button>
          <Button variant="secondary" onPress={() => setPorCambiar(null)} fullWidth>
            Ahora no
          </Button>
        </View>
      </Modal>
    </ScreenLayout>
  );
}
