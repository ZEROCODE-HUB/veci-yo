import { theme } from "@/config";
import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export function ConfiguracionCampoBloqueado({
  label,
  value,
  isLast,
}: {
  label: string;
  value: string;
  isLast?: boolean;
}) {
  return (
    <View
      className="flex-row items-center justify-between py-3.5"
      style={{
        borderBottomWidth: isLast ? 0 : 1,
        borderBottomColor: theme.colors.borderLight,
      }}
    >
      {/* Que el texto se encoja: un correo largo empujaba el candado fuera (29/10/2026). */}
      <Text className="flex-1 mr-3 text-base text-gray-900" numberOfLines={1}>
        {label}: {value}
      </Text>
      <Ionicons name="lock-closed" size={18} color={theme.colors.textMuted} />
    </View>
  );
}
