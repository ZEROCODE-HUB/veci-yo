import { View, Text, Image } from "react-native";

const fondoOnboarding = require("@/assets/branding/fondo-onboarding-3.png");

/**
 * La cabecera de la pantalla de entrada.
 *
 * Llevaba debajo un boton de «Ingresar de incognito» que **no era un modo de
 * invitado**: metia en la aplicacion con dos casas inventadas --«Casa Amorcito»
 * en Miraflores y «Casa Mama» en Cusco-- y enseñaba una vivienda que no es de
 * nadie. Era otro mockup, con otro nombre, y se retiro el 06/10/2026 junto con
 * los botones de demostracion.
 */
export function LoginHero() {
  return (
    <View className="bg-white rounded-xl overflow-hidden shadow-card">
      <Image
        source={fondoOnboarding}
        style={{ width: "100%", height: 215 }}
        resizeMode="cover"
      />
      <View className="p-4 gap-3.5">
        <Text className="text-base font-semibold text-gray-900 text-center leading-5">
          Tu app gratuita para llevar tus relaciones vecinales
        </Text>
      </View>
    </View>
  );
}
