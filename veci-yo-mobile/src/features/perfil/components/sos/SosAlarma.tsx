import { View, Text, Image } from "react-native";
import { Button } from "@/shared/components";

const sosIlustracion = require("@/assets/branding/sos.png");

export function SosAlarma({
  onCancelar,
  onGuardia,
}: {
  onCancelar: () => void;
  onGuardia: () => void;
}) {
  return (
    <View className="p-4 gap-5">
      <View
        className="bg-white rounded-xl p-5 text-center"
        style={{
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.08,
          shadowRadius: 8,
          elevation: 3,
        }}
      >
        <Text
          className="text-lg font-extrabold text-gray-900 text-center"
          style={{ lineHeight: 24 }}
        >
          ¡ALARMA SONORA ACTIVADA TODOS LOS GUARDIAS SERAN NOTIFICADOS!
        </Text>
      </View>
      <View
        className="rounded-xl overflow-hidden"
        style={{
          height: 220,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.08,
          shadowRadius: 8,
          elevation: 3,
        }}
      >
        <Image
          source={sosIlustracion}
          style={{ width: "100%", height: "100%" }}
          resizeMode="cover"
        />
      </View>
      <Button variant="danger" onPress={onCancelar}>
        🔕 Cancelar alarma
      </Button>
      <Button variant="primary" onPress={onGuardia}>
        🛡️ Llego el guardia
      </Button>
    </View>
  );
}
