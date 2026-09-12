import { View, Text } from "react-native";

interface AlojamientoInfoChipProps {
  icon: string;
  label: string;
  value?: string | number;
}

export function AlojamientoInfoChip({
  icon,
  label,
  value,
}: AlojamientoInfoChipProps) {
  if (!value && value !== 0) return null;

  return (
    <View
      className="flex-row items-center gap-2 px-3 py-2 rounded-full"
      style={{
        backgroundColor: "#F9FAFB",
        borderWidth: 1,
        borderColor: "#E5E7EB",
      }}
    >
      <Text style={{ fontSize: 16 }}>{icon}</Text>
      <Text className="text-xs text-gray-500">{label}:</Text>
      <Text className="text-sm font-semibold text-gray-900">{value}</Text>
    </View>
  );
}

