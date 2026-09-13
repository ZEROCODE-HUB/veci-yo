import { View, Text, Pressable, Image } from "react-native";

export function SoporteSeccionCard({
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
      className="items-center justify-center rounded-2xl py-6 px-4"
      style={{
        width: "48%",
        minWidth: 140,
        backgroundColor: "#fff",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
        gap: 12,
        minHeight: 120,
      }}
    >
      <View
        className="items-center justify-center rounded-full overflow-hidden"
        style={{ width: 56, height: 56, backgroundColor: "#FEF3C7" }}
      >
        <Image
          source={icon}
          style={{ width: "100%", height: "100%" }}
          resizeMode="cover"
        />
      </View>
      <Text className="text-sm text-gray-900 font-medium text-center">
        {label}
      </Text>
    </Pressable>
  );
}
