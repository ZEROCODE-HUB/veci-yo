import React from "react";
import { Image, Pressable, Text, View } from "react-native";
import type { ZonaComun } from "@/shared/types";
import { zonaIcons2 } from "@/assets/icons/zonas";

const icons = zonaIcons2 as Record<string, any>;

interface Props {
  zona: ZonaComun;
  restringida?: boolean;
  onPress: () => void;
}

export function ZonaCard({ zona, restringida = false, onPress }: Props) {
  const iconAsset = icons[zona.id];

  return (
    <Pressable
      onPress={onPress}
      className="items-center gap-2.5 rounded-2xl p-4 bg-white"
      style={{
        opacity: restringida ? 0.5 : 1,
        elevation: 3,
        shadowColor: "#000",
        shadowOpacity: 0.08,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
      }}
    >
      <View className="h-16 w-16 items-center justify-center rounded-full overflow-hidden">
        {iconAsset ? (
          <Image source={iconAsset} className="h-16 w-16" resizeMode="cover" />
        ) : (
          <Text className="text-4xl">{zona.emoji}</Text>
        )}
      </View>
      <Text className="text-sm font-semibold text-gray-900 text-center">
        {zona.nombre}
      </Text>
    </Pressable>
  );
}
