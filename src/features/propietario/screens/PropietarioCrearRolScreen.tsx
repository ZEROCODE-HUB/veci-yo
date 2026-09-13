import React from "react";
import { View, Text, ScrollView } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import { Modal } from "@/shared/components";
import type { PropietarioStackParamList } from "@/shared/types";
import { usePropietarioRol } from "../hooks/usePropietarioRol";
import {
  PropietarioRolForm,
  PropietarioServiciosModal,
} from "../components/roles";

type RouteType = RouteProp<PropietarioStackParamList, "CrearRol">;

export function PropietarioCrearRolScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteType>();
  const editData = route.params?.editar;
  const form = usePropietarioRol(editData, route.params?.rolPreseleccionado);
  const cerrarExito = () => {
    form.setShowSuccess(false);
    navigation.goBack();
  };

  return (
    <ScrollView
      className="flex-1 bg-gray-50"
      contentContainerClassName="p-4 gap-3"
    >
      <PropietarioRolForm
        control={form.control}
        errors={form.formState.errors}
        rol={form.watch("rol")}
        servicios={form.servicios}
        onToggleServicio={form.toggleServicio}
        onOpenServicios={() => form.setShowServicios(true)}
        onSubmit={form.guardar}
        editando={form.esEdicion}
      />
      <PropietarioServiciosModal
        visible={form.showServicios}
        servicios={form.servicios}
        onToggle={form.toggleServicio}
        onClose={() => form.setShowServicios(false)}
      />
      <Modal
        visible={form.showSuccess}
        onClose={cerrarExito}
        title="Configuración"
      >
        <View className="text-center py-2">
          <Text
            className="text-base text-gray-900 text-center"
            style={{ lineHeight: 22 }}
          >
            Alquiler tradicional configurado con éxito!
          </Text>
        </View>
      </Modal>
    </ScrollView>
  );
}
