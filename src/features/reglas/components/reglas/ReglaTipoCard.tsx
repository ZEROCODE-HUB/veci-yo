import { theme } from "@/config";
import { Image, Pressable, Text } from "react-native";

export function ReglaTipoCard({
  icon,
  label,
  onPress,
}: {
  icon: number;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="items-center rounded-2xl bg-white p-5 gap-2"
      style={{
        elevation: 2,
        shadowColor: theme.colors.shadow,
        shadowOpacity: 0.08,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
      }}
    >
      <Image
        style={{ height: 56, width: 56 }}
        source={icon}
        className="rounded-full"
        resizeMode="cover"
      />
      <Text className="text-xs font-semibold text-center text-gray-900">
        {label}
      </Text>
    </Pressable>
  );
}
