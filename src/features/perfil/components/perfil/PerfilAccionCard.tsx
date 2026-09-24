import { theme } from "@/config";
import { View, Text, Pressable, Image } from "react-native";

export function PerfilAccionCard({
  icon,
  label,
  onPress,
}: {
  icon: any;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-1 items-center gap-2.5 py-5 px-3"
      style={{
        backgroundColor: theme.colors.bgCard,
        borderRadius: 20,
        shadowColor: theme.colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
      }}
    >
      <View
        className="items-center justify-center rounded-full overflow-hidden"
        style={{
          width: 48,
          height: 48,
          backgroundColor: theme.colors.warningLight,
        }}
      >
        <Image
          source={icon}
          style={{ width: "100%", height: "100%" }}
          resizeMode="cover"
        />
      </View>
      <Text className="text-sm text-gray-500 font-medium">{label}</Text>
    </Pressable>
  );
}
