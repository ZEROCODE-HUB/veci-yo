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
      <Text className="text-base text-gray-900">
        {label}: {value}
      </Text>
      <Ionicons name="lock-closed" size={18} color={theme.colors.textMuted} />
    </View>
  );
}
