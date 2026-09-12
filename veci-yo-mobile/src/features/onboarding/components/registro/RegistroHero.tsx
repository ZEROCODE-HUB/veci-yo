import { View, Text, Image } from "react-native";

const fondoOnboarding = require("@/assets/branding/fondo-onboarding-3.png");

export function RegistroHero() {
  return (
    <View className="bg-white rounded-xl overflow-hidden shadow-card">
      <Image
        source={fondoOnboarding}
        className="w-full"
        style={{ height: 215 }}
        resizeMode="cover"
      />
      <Text className="text-base font-semibold text-gray-900 text-center p-4">
        Ingrese los datos para obtener su cuenta
      </Text>
    </View>
  );
}
