import { View, Text, Pressable } from "react-native";
import type { UbicacionAccionProps } from "../../types";

export function UbicacionCard({
  ubicacion,
  esGuardia,
  onEditar,
  onEliminar,
  onFavorito,
}: UbicacionAccionProps) {
  const nombre = esGuardia
    ? `Guardia de seguridad: ${ubicacion.alias || ubicacion.direccion}`
    : ubicacion.direccion;

  return (
    <View
      className="bg-white rounded-xl overflow-hidden"
      style={{
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
      }}
    >
      <View
        className="flex-row items-center gap-2.5 px-4 py-3.5"
        style={{ borderBottomWidth: 1, borderBottomColor: "#F3F4F6" }}
      >
        <Text style={{ fontSize: 18 }}>🏠</Text>
        <Text className="flex-1 text-base font-medium text-gray-900" numberOfLines={1}>
          {nombre}
        </Text>
        <Pressable onPress={() => onFavorito(ubicacion.id)} className="p-0.5">
          <Text style={{ fontSize: 18, color: ubicacion.favorito ? "#F5B800" : "#9CA3AF" }}>
            {ubicacion.favorito ? "★" : "☆"}
          </Text>
        </Pressable>
      </View>
      <View className="flex-row items-center gap-2.5 px-4 py-3.5">
        <Text style={{ fontSize: 18 }}>🏷️</Text>
        <Text className="flex-1 text-sm text-gray-500" numberOfLines={1}>
          {esGuardia ? nombre : `Alias: ${ubicacion.alias}`}
        </Text>
        <Pressable onPress={() => onEditar(ubicacion)} className="p-0.5">
          <Text style={{ fontSize: 16, color: "#9CA3AF" }}>✏️</Text>
        </Pressable>
        <Pressable onPress={() => onEliminar(ubicacion)} className="p-0.5">
          <Text style={{ fontSize: 18, color: "#9CA3AF" }}>🗑️</Text>
        </Pressable>
      </View>
    </View>
  );
}

