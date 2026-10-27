import React from "react";
import { Text, View } from "react-native";
import { Input, Toggle } from "@/shared/components";
import { SeccionDeConfiguracion } from "./SeccionDeConfiguracion";
import type { RentaCorta } from "./tipos";

/** Mascotas, niños, descripción y habitaciones del alojamiento. */
export function ReglasDeConvivencia({ renta: r }: { renta: RentaCorta }) {
  return (
    <SeccionDeConfiguracion titulo="Reglas de convivencia y preferencias">
      <View className="flex-col gap-4">
        <View className="flex-row justify-between items-center">
          <Text className="text-sm text-gray-900 flex-1">Se admiten mascotas</Text>
          <Toggle value={r.permiteMascotas} onChange={r.setPermiteMascotas} />
        </View>
        <View className="flex-row justify-between items-center">
          <Text className="shrink text-sm text-gray-900">Apta para niños</Text>
          <Toggle value={r.aptoNinos} onChange={r.setAptoNinos} />
        </View>
        <View>
          <Text className="text-sm text-gray-900 font-medium mb-1">
            Descripción del alojamiento
          </Text>
          <Input
            value={r.descripcion}
            onChangeText={r.setDescripcion}
            placeholder="N habitaciones, camas, info de aforo..."
            multiline
          />
        </View>
        <Input
          label="Habitaciones"
          value={String(r.numHabitaciones)}
          onChangeText={(v) => r.setNumHabitaciones(parseInt(v, 10) || 0)}
          soloCifras
        />
      </View>
    </SeccionDeConfiguracion>
  );
}
