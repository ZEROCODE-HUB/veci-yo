import React from "react";
import { ScrollView } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useUIStore } from "@/stores";
import { usePropietarioServicio } from "../hooks/usePropietarioServicio";
import { PropietarioServicioForm } from "../components/servicios";

export function PropietarioAgregarServicioScreen() {
  const navigation = useNavigation();
  const { addToast } = useUIStore();
  const form = usePropietarioServicio();
  const handleAgregar = form.handleSubmit(async (values) => {
    await form.agregar.mutateAsync(values);
    addToast("Servicio agregado correctamente", "success");
    navigation.goBack();
  });
  return (
    <ScrollView
      className="flex-1 bg-gray-50"
      contentContainerClassName="p-4 gap-3"
    >
      <PropietarioServicioForm
        control={form.control}
        errors={form.formState.errors}
        onSubmit={handleAgregar}
      />
    </ScrollView>
  );
}
