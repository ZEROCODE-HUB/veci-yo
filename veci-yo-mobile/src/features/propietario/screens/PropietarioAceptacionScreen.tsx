import React from "react";
import { View, Text, ScrollView } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import { useUbicacionStore, useUIStore } from "@/stores";
import { Button } from "@/shared/components";
import type { PropietarioStackParamList } from "@/shared/types";
import { usePropietarioAceptacion } from "../hooks/usePropietarioAceptacion";
import { PropietarioAceptacionForm } from "../components/aceptacion";

type RouteType = RouteProp<PropietarioStackParamList, "Aceptar">;

export function PropietarioAceptacionScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteType>();
  const { ubicaciones } = useUbicacionStore();
  const { addToast } = useUIStore();
  const form = usePropietarioAceptacion();
  const ubicacion = ubicaciones.find(
    (item) => item.id === route.params?.ubicacionId,
  );
  const handleFinalizar = form.handleSubmit(() => {
    addToast("Propiedad aceptada y configurada con éxito", "success");
    navigation.goBack();
  });
  return (
    <ScrollView
      className="flex-1 bg-gray-50"
      contentContainerClassName="p-4 gap-3"
    >
      {ubicacion && (
        <View
          className="rounded-2xl p-4"
          style={{
            backgroundColor: "#fff",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.08,
            shadowRadius: 8,
            elevation: 3,
          }}
        >
          <Text className="text-sm" style={{ color: "#6B7280" }}>
            Propiedad
          </Text>
          <Text className="text-base font-semibold text-gray-900 mt-1">
            {ubicacion.direccion}
          </Text>
        </View>
      )}
      <PropietarioAceptacionForm control={form.control} />
      <View
        className="rounded-2xl p-4 flex-row justify-between items-center"
        style={{
          backgroundColor: "#fff",
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.08,
          shadowRadius: 8,
          elevation: 3,
        }}
      >
        <View>
          <Text className="text-base text-gray-900">Estacionamientos</Text>
          <Text className="text-xs mt-1" style={{ color: "#6B7280" }}>
            Asignados por el Administrador
          </Text>
        </View>
        <Text className="text-base font-semibold" style={{ color: "#6B7280" }}>
          0
        </Text>
      </View>
      <View className="h-2" />
      <Button variant="primary" onPress={handleFinalizar}>
        Finalizar
      </Button>
      <View className="h-4" />
    </ScrollView>
  );
}
