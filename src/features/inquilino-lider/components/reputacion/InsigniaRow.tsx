import { theme } from "@/config";
import { View, Text } from "react-native";
import type { InsigniaVecino } from "../../types";

interface InsigniaRowProps {
  insignia: InsigniaVecino;
  isLast: boolean;
}

export function InsigniaRow({ insignia, isLast }: InsigniaRowProps) {
  return (
    <View
      className="flex-row items-center gap-3 py-3"
      style={{
        borderBottomWidth: isLast ? 0 : 1,
        borderBottomColor: theme.colors.borderLight,
      }}
    >
      <View
        className="items-center justify-center rounded-full"
        style={{ width: 48, height: 48, backgroundColor: theme.colors.warningLight }}
      >
        <Text style={{ fontSize: 24 }}>{insignia.icono}</Text>
      </View>
      <View className="flex-1 min-w-0">
        <Text className="text-base font-semibold text-gray-900">
          {insignia.label}
        </Text>
      </View>
      <Text className="text-base font-bold text-secondary flex-shrink-0 text-right">
        {insignia.cantidad}
      </Text>
    </View>
  );
}

