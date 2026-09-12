import React from "react";
import { Image, Pressable, Text } from "react-native";
import type { ZonaComun } from "@/shared/types";
import zonaIcons from "@/assets/icons/zonas";

const icons = zonaIcons as Record<string, any>;

interface Props {
  zona: ZonaComun;
  restringida?: boolean;
  onPress: () => void;
}

export function ZonaCard({ zona, restringida = false, onPress }: Props) {
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
      <Image
        source={icons[zona.id]}
        className="w-16 h-16 rounded-full"
        resizeMode="cover"
      />
      <Text className="text-sm font-semibold text-gray-900 text-center">
        {zona.nombre}
      </Text>
    </Pressable>
  );
}
