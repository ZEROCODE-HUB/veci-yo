import { theme } from "@/config";
import { View, Text } from "react-native";
import type { LibroHuesped } from "../../types";
import { CopiarFila } from "./CopiarFila";

interface LibroHuespedContenidoProps {
  libro: LibroHuesped;
}

const cardStyle = {
  backgroundColor: theme.colors.bgCard,
  borderRadius: 20,
  boxShadow: theme.shadows.card,
};

export function LibroHuespedContenido({ libro }: LibroHuespedContenidoProps) {
  return (
    <>
      <View className="p-4 gap-3" style={cardStyle}>
        <Text className="text-base font-bold text-gray-900">
          📶 Conexión Wi-Fi
        </Text>
        {!libro.wifiName && !libro.wifiPassword ? (
          <View
            className="items-center p-3 rounded-xl"
            style={{ backgroundColor: theme.colors.bgMuted }}
          >
            <Text className="text-sm text-gray-400">
              Información de Wi-Fi no disponible por el momento
            </Text>
          </View>
        ) : (
          <View className="gap-2.5">
            {libro.wifiName && (
              <CopiarFila label="Nombre de la red" value={libro.wifiName} />
            )}
            {libro.wifiPassword && (
              <CopiarFila label="Contraseña" value={libro.wifiPassword} mono />
            )}
            {/* Decia "Red abierta -- no requiere contrasena" siempre que
                faltara la clave. Pero la clave del wifi se guarda cifrada en
                Vault y no viaja con el resto del libro, asi que el mensaje
                afirmaba algo falso: la red puede estar protegida y la clave
                simplemente no haberse pedido todavia. */}
            {!libro.wifiPassword && libro.wifiName && (
              <View
                className="items-center p-2 rounded-lg"
                style={{ backgroundColor: theme.colors.bgMuted }}
              >
                <Text className="text-xs text-gray-400">
                  La contraseña te la comparte el anfitrión
                </Text>
              </View>
            )}
          </View>
        )}
      </View>

      <View className="p-4 gap-3" style={cardStyle}>
        <Text className="text-base font-bold text-gray-900">
          🔑 Acceso al alojamiento
        </Text>
        {!libro.doorPassword ? (
          <View
            className="items-center p-3 rounded-xl"
            style={{ backgroundColor: theme.colors.bgMuted }}
          >
            <Text className="text-sm text-gray-400">
              El código de acceso será compartido directamente por el
              propietario
            </Text>
          </View>
        ) : (
          <CopiarFila
            label="Código / contraseña de la puerta"
            value={libro.doorPassword}
            mono
          />
        )}
        <View
          className="flex-row gap-2 items-start p-2.5 rounded-xl mt-2.5"
          style={{ backgroundColor: theme.colors.secondaryLight }}
        >
          <Text style={{ fontSize: 16, flexShrink: 0 }}>💡</Text>
          <Text
            className="text-xs leading-5"
            style={{ color: theme.colors.secondaryDark }}
          >
            Guarda este código en un lugar seguro. Si tienes dificultades,
            contacta al anfitrión primario del departamento.
          </Text>
        </View>
      </View>

      <View className="p-4 gap-3" style={cardStyle}>
        <Text className="text-base font-bold text-gray-900">
          📋 Instrucciones del anfitrión
        </Text>
        {!libro.instructions ? (
          <View
            className="items-center p-3 rounded-xl"
            style={{ backgroundColor: theme.colors.bgMuted }}
          >
            <Text className="text-sm text-gray-400">
              Sin instrucciones adicionales
            </Text>
          </View>
        ) : (
          <View
            className="p-3.5 rounded-xl"
            style={{
              backgroundColor: theme.colors.bgMuted,
              borderWidth: 1,
              borderColor: theme.colors.border,
            }}
          >
            <Text className="text-sm text-gray-900 leading-7">
              {libro.instructions}
            </Text>
          </View>
        )}
      </View>

      <View className="p-4 gap-3" style={cardStyle}>
        <Text className="text-base font-bold text-gray-900">
          💛 Notas y recomendaciones
        </Text>
        {!libro.notes ? (
          <View
            className="items-center p-3 rounded-xl"
            style={{ backgroundColor: theme.colors.bgMuted }}
          >
            <Text className="text-sm text-gray-400">Sin notas adicionales</Text>
          </View>
        ) : (
          <View
            className="p-3.5 rounded-xl"
            style={{
              backgroundColor: theme.colors.badgeAmberBg,
              borderWidth: 1,
              borderColor: theme.colors.badgeAmberBorder,
            }}
          >
            <Text
              className="text-sm leading-7"
              style={{ color: theme.colors.iconAmberDark }}
            >
              {libro.notes}
            </Text>
          </View>
        )}
        <View className="flex-row gap-2 items-center justify-center mt-2.5">
          <Text style={{ fontSize: 14 }}>🏡</Text>
          <Text className="text-xs text-gray-400">
            Esperamos que disfrutes tu estadía — ¡haz de este espacio tu hogar!
          </Text>
        </View>
      </View>

      <View
        className="flex-row gap-2.5 items-start p-3.5 rounded-xl"
        style={{ backgroundColor: theme.colors.bgMuted }}
      >
        <Text style={{ fontSize: 18 }}>🆘</Text>
        <View className="flex-1">
          <Text className="text-sm font-semibold text-gray-900">
            ¿Necesitas ayuda durante tu estadía?
          </Text>
          <Text className="text-xs text-gray-500 mt-0.5 leading-5">
            Contacta al anfitrión primario desde el directorio o usa el chat de
            la vivienda. Estamos aquí para que todo sea cálido y sencillo.
          </Text>
        </View>
      </View>
    </>
  );
}
