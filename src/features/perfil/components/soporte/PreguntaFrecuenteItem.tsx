import { View, Text, Pressable } from "react-native";
import type { FaqItem } from "../../soporteMockData";

export function PreguntaFrecuenteItem({
  item,
  open,
  onPress,
}: {
  item: FaqItem;
  open: boolean;
  onPress: () => void;
}) {
  return (
    <View
      className="overflow-hidden"
      style={{
        backgroundColor: "#fff",
        borderRadius: open ? 20 : 999,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
      }}
    >
      <Pressable
        onPress={onPress}
        className="flex-row items-center justify-between gap-2.5 py-3.5 px-4"
      >
        <Text className="flex-1 text-base font-medium text-gray-900">
          · {item.pregunta}
        </Text>
        <Text
          style={{
            fontSize: 14,
            color: "#6B7280",
            transform: [{ rotate: open ? "180deg" : "0deg" }],
          }}
        >
          ▾
        </Text>
      </Pressable>
      {open && (
        <View className="px-4 pb-4">
          <Text className="text-sm text-gray-500" style={{ lineHeight: 22 }}>
            {item.respuesta}
          </Text>
        </View>
      )}
    </View>
  );
}
