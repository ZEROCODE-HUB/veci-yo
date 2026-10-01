import { theme } from "@/config";
import { View, Text, Image } from "react-native";

const bannerUbicacion = require("@/assets/branding/banner-ubicacion.png");

export function UbicacionIntroduccion() {
  return (
    <View
      className="bg-white rounded-xl p-4 items-center gap-3"
      style={{
        shadowColor: theme.colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
      }}
    >
      <Text
        className="text-sm font-semibold text-gray-900 text-center"
        style={{ lineHeight: 20 }}
      >
        Aquí están las viviendas de las que eres miembro. Toca la estrella
        para cambiar a la que quieras ver.
      </Text>
      <Image
        source={bannerUbicacion}
        style={{ width: "100%", maxWidth: 370, height: 170 }}
        resizeMode="contain"
      />
    </View>
  );
}
