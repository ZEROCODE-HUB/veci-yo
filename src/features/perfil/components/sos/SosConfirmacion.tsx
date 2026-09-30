import { theme } from "@/config";
import { View, Text, Image } from "react-native";
import { Button } from "@/shared/components";

const sosIlustracion = require("@/assets/branding/sos.png");

/**
 * El paso que falta antes de que suene.
 *
 * La alarma se disparaba al entrar en la pantalla, y se entra desde un renglón
 * de «Perfil» que está justo encima de «Configuración»: un toque de más y ya
 * sonaba en el teléfono de todos los guardias de turno, con el nombre y el
 * departamento de quien lo pulsó. Decidido con el cliente el 29/09/2026
 * (punto 69 de `REVISAR-A-OJO.md`).
 *
 * La confirmación vive **aquí** y no en el botón de «Perfil» porque así vale
 * para cualquier camino que lleve a esta pantalla, hoy y mañana. Y es un solo
 * toque más, grande y sin texto que leer: en una emergencia real no se lee, se
 * pulsa lo rojo.
 */
interface Props {
  onConfirmar: () => void;
  onCancelar: () => void;
}

export function SosConfirmacion({ onConfirmar, onCancelar }: Props) {
  return (
    <View className="p-4 gap-5">
      <View
        className="bg-white rounded-xl p-5 gap-2"
        style={{
          shadowColor: theme.colors.shadow,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.08,
          shadowRadius: 8,
          elevation: 3,
        }}
      >
        <Text
          className="text-lg font-extrabold text-center text-gray-900"
          style={{ lineHeight: 24 }}
        >
          ¿Activar la alarma de emergencia?
        </Text>
        <Text className="text-base text-center text-gray-600">
          Sonará en el teléfono de todos los guardias de turno con tu nombre y
          tu departamento.
        </Text>
      </View>

      <View
        className="rounded-xl overflow-hidden"
        style={{
          height: 220,
          shadowColor: theme.colors.shadow,
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

      <Button variant="danger" onPress={onConfirmar}>
        🚨 Sí, pedir auxilio ahora
      </Button>
      <Button variant="secondary" onPress={onCancelar}>
        Volver sin avisar
      </Button>
    </View>
  );
}
