import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export interface ContratoResumen {
  id: number;
  numero: string;
  estado: string;
  rango: string;
  fechaInicio: string;
  fechaFin: string;
}

export function ContratoCard({
  contrato,
  onPress,
}: {
  contrato: ContratoResumen;
  onPress: () => void;
}) {
  const activa = contrato.estado === "Activa";
  return (
    <Pressable
      onPress={onPress}
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
      <View className="flex-row items-center gap-2.5 mb-3">
        <Ionicons name="document-text-outline" size={20} color="#6B7280" />
        <Text className="text-base font-semibold text-gray-900">
          Contrato N°: {contrato.numero}
        </Text>
      </View>
      <View className="flex-row items-center justify-between">
        <Text
          className="text-xs font-bold px-3 py-1 rounded-full"
          style={{
            color: activa ? "#111827" : "#fff",
            backgroundColor: activa ? "#F5B800" : "#2563EB",
          }}
        >
          {contrato.estado}
        </Text>
        <View className="flex-row items-center gap-1.5">
          <Ionicons name="time-outline" size={14} color="#6B7280" />
          <Text className="text-xs" style={{ color: "#6B7280" }}>
            {contrato.rango}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}
