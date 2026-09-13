import { View, Text } from "react-native";

export function LibroHuespedVacio() {
  return (
    <View
      className="items-center py-8 px-5"
      style={{
        backgroundColor: "#fff",
        borderRadius: 20,
        boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
      }}
    >
      <Text style={{ fontSize: 48, marginBottom: 12 }}>📖</Text>
      <Text className="text-lg font-bold text-gray-900">
        Tu Guestbook aún está vacío
      </Text>
      <Text
        className="text-sm text-gray-500 mt-2 text-center leading-6"
        style={{ maxWidth: 320 }}
      >
        El propietario aún no ha cargado la información del alojamiento.
        Cuando lo haga, aquí encontrarás el Wi-Fi, códigos de acceso,
        instrucciones y recomendaciones para que tu estadía sea perfecta.
      </Text>
      <View
        className="mt-3.5 rounded-full px-3 py-1.5"
        style={{ backgroundColor: "#F9FAFB" }}
      >
        <Text className="text-xs text-gray-500 text-center">
          💡 Consejo: contacta al anfitrión si necesitas la información con
          urgencia
        </Text>
      </View>
    </View>
  );
}

