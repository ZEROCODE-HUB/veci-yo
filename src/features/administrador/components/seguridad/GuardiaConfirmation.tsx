import { Button } from "@/shared/components";
import { PageHeader } from "@/shared/layouts";
import { ScrollView, Text, View } from "react-native";
import type { GuardiaFormValues } from "../../types";

export function GuardiaConfirmation({
  form,
  onBack,
  onConfirm,
}: {
  form: GuardiaFormValues;
  onBack: () => void;
  onConfirm: () => void;
}) {
  return (
    <View className="flex-1 bg-bg-app">
      <PageHeader title="Confirmar edición" onBack={onBack} />
      <ScrollView className="flex-1" contentContainerClassName="p-4 gap-4">
        <Text className="text-sm text-gray-500">
          Revisa los datos del guardia antes de confirmar
        </Text>
        <View className="rounded-2xl bg-white p-4 gap-3 border border-primary">
          <Text className="text-lg font-bold text-gray-900">{form.nombre}</Text>
          <Text className="text-sm text-gray-500">{form.correo}</Text>
          <Text className="text-sm text-gray-500">
            Cédula: {form.cedula || "No registrada"}
          </Text>
          <Text className="text-sm text-gray-500">
            Garita: {form.garita || "No asignada"}
          </Text>
          <Text className="text-sm font-semibold text-gray-800">Turnos</Text>
          {form.turnos.map((turno, index) => (
            <Text key={index} className="text-sm text-gray-500">
              {turno.dia || "Día no definido"} - {turno.hora || "Hora no definida"}
            </Text>
          ))}
          <Text className="text-sm text-gray-500">
            Chat: {form.permisoChat ? "Permitido" : "No permitido"} ·
            Llamadas: {form.permisoLlamadas ? "Permitidas" : "No permitidas"}
          </Text>
        </View>
        <Button fullWidth onPress={onConfirm}>
          Aceptar y guardar
        </Button>
      </ScrollView>
    </View>
  );
}
