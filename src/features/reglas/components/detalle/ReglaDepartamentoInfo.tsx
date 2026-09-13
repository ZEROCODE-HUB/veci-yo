import { Text, View } from "react-native";

export function ReglaDepartamentoInfo() {
  return (
    <View
      className="rounded-2xl bg-white p-4 gap-3"
      style={{
        elevation: 3,
        shadowColor: "#000",
        shadowOpacity: 0.08,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
      }}
    >
      <Text className="text-base font-bold text-gray-900">
        Información del departamento
      </Text>
      <Text className="text-sm text-gray-900">
        <Text className="font-semibold">1er contacto: Anfitrión</Text> — María
        Pérez
      </Text>
      <Text className="text-sm text-gray-900">
        <Text className="font-semibold">2do contacto: Administrador</Text> —
        Carlos Gómez
      </Text>
      <Text className="text-sm text-gray-900">
        <Text className="font-semibold">3er contacto: Propietario</Text> — Juan
        López
      </Text>
    </View>
  );
}
