import React from "react";
import { View, Text, ScrollView } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import { Modal } from "@/shared/components";
import type { PropietarioStackParamList } from "@/shared/types";
import { usePropietarioRol } from "../hooks/usePropietarioRol";
import { PropietarioRolForm } from "../components/roles";

type RouteType = RouteProp<PropietarioStackParamList, "CrearRol">;

export function PropietarioCrearRolScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteType>();
  const editData = route.params?.editar;
  const form = usePropietarioRol(editData);
  const cerrarExito = () => {
    form.setShowSuccess(false);
    navigation.goBack();
  };

  /*
    Esta pantalla solo edita. Dar de alta a alguien es «Invitar a la
    vivienda», que es el unico camino desde el 09/10/2026. Si se llega aqui
    sin nadie a quien editar, se dice en vez de enseñar un formulario que no
    guardaria nada.
  */
  if (!editData) {
    return (
      <View className="flex-1 bg-gray-50 p-4">
        <Text className="text-sm text-gray-500">
          Para agregar a alguien a la vivienda usa «Invitar a alguien a la
          vivienda», en Configuración.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-gray-50"
      contentContainerClassName="p-4 gap-3"
    >
      <PropietarioRolForm
        control={form.control}
        errors={form.formState.errors}
        rol={form.watch("rol")}
        onSubmit={form.guardar}
        editando={form.esEdicion}
      />
      <Modal
        visible={form.showSuccess}
        onClose={cerrarExito}
        title="Cambios guardados"
      >
        <View className="text-center py-2">
          <Text
            className="text-base text-gray-900 text-center"
            style={{ lineHeight: 22 }}
          >
            Los cambios de {editData?.nombre ?? "esta persona"} quedaron guardados.
          </Text>
        </View>
      </Modal>
    </ScrollView>
  );
}
