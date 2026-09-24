import { theme } from "@/config";
import { Image, Pressable, Text } from "react-native";
export function RegulationCard({
  image,
  label,
  onPress,
}: {
  image: number;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-1 rounded-2xl bg-white p-3 items-center gap-2"
      style={{
        elevation: 3,
        shadowColor: theme.colors.shadow,
        shadowOpacity: 0.08,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
      }}
    >
      <Image
        style={{ width: 56, height: 56 }}
        source={image}
        className="rounded-full"
      />
      <Text className="text-xs font-semibold text-gray-900 text-center">
        {label}
      </Text>
    </Pressable>
  );
}
