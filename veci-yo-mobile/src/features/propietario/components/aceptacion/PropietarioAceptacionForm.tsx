import { View, Text } from "react-native";
import { Controller, type Control } from "react-hook-form";
import { Toggle } from "@/shared/components";
import type { AceptacionFormData } from "../../schemas/propietario.schema";

export function PropietarioAceptacionForm({
  control,
}: {
  control: Control<AceptacionFormData>;
}) {
  return (
    <View
      className="rounded-2xl px-4 py-1"
      style={{
        backgroundColor: "#fff",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
      }}
    >
      <Controller
        control={control}
        name="permiteRentaCorta"
        render={({ field }) => (
          <View
            className="flex-row justify-between items-center py-3.5"
            style={{ borderBottomWidth: 1, borderBottomColor: "#F3F4F6" }}
          >
            <Text className="text-base text-gray-900">Permite renta corta</Text>
            <Toggle value={!!field.value} onChange={field.onChange} />
          </View>
        )}
      />
      <Controller
        control={control}
        name="permiteMascotas"
        render={({ field }) => (
          <View
            className="flex-row justify-between items-center py-3.5"
            style={{ borderBottomWidth: 1, borderBottomColor: "#F3F4F6" }}
          >
            <Text className="text-base text-gray-900">Permite mascotas</Text>
            <Toggle value={!!field.value} onChange={field.onChange} />
          </View>
        )}
      />
      <Controller
        control={control}
        name="aptoNinos"
        render={({ field }) => (
          <View className="flex-row justify-between items-center py-3.5">
            <Text className="text-base text-gray-900">Apto para niños</Text>
            <Toggle value={!!field.value} onChange={field.onChange} />
          </View>
        )}
      />
    </View>
  );
}
