import React from "react";
import { Text, View } from "react-native";

/** La lista de visitas sin nada que enseñar. Salió de `VisitasHistorialScreen` el 26/10/2026. */
export function HistorialVacio({ buscando }: { buscando: boolean }) {
  return (
    <View className="items-center justify-center py-20">
      <Text className="text-5xl mb-4">📭</Text>
      <Text className="text-lg font-bold text-gray-900 mb-1">No hay visitas</Text>
      <Text className="text-sm text-gray-500 text-center">
        {buscando
          ? "No se encontraron visitas con esos filtros"
          : "Todavía no tienes visitas registradas"}
      </Text>
    </View>
  );
}
