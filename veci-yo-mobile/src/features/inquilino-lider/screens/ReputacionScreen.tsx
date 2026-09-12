import { useState } from "react";
import { View, Text, ScrollView } from "react-native";
import { InsigniaRow, LinkReputacionModal } from "../components/reputacion";
import { useReputacion } from "../hooks/useReputacion";

export function ReputacionScreen() {
  const [linkOpen, setLinkOpen] = useState(false);
  const { insignias } = useReputacion();

  return (
    <View className="flex-1 bg-gray-50">
      <ScrollView className="flex-1" contentContainerClassName="p-4 gap-3.5">
        <Text className="text-base font-semibold text-gray-900" style={{ lineHeight: 22 }}>
          Tus Insignias de vecino reconocen tu participación y buenas acciones en la comunidad.
        </Text>

        <View
          className="bg-white rounded-xl p-4"
          style={{
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.08,
            shadowRadius: 8,
            elevation: 3,
          }}
        >
          <View className="flex-row items-center justify-between mb-1">
            <Text className="text-lg font-bold text-gray-900">Insignias de vecino</Text>
          </View>
          {insignias.map((insignia, index) => (
            <InsigniaRow
              key={insignia.key}
              insignia={insignia}
              isLast={index === insignias.length - 1}
            />
          ))}
        </View>

        <View className="h-6" />
      </ScrollView>

      <LinkReputacionModal
        visible={linkOpen}
        onClose={() => setLinkOpen(false)}
      />
    </View>
  );
}
