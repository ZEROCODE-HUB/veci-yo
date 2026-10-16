import { theme } from "@/config";
import React from "react";
import { Image, Pressable, Text, View, type ImageSourcePropType } from "react-native";
import type { ZonaComun } from "@/shared/types";
import { zonaIcons2 } from "@/assets/icons/zonas";
import { claveDeIcono } from "../helpers/claveDeIcono";

const icons = zonaIcons2 as Record<string, ImageSourcePropType>;

interface Props {
  zona: ZonaComun;
  restringida?: boolean;
  onPress: () => void;
}

export function ZonaCard({ zona, restringida = false, onPress }: Props) {
  // Por la clave o el nombre: el id es un uuid (16/10/2026).
  const iconAsset = icons[zona.id] ?? icons[claveDeIcono(zona) ?? ""];

  return (
    <Pressable
      onPress={onPress}
      className="items-center gap-2.5 rounded-2xl p-4 bg-white"
      style={{
        opacity: restringida ? 0.5 : 1,
        elevation: 3,
        shadowColor: theme.colors.shadow,
        shadowOpacity: 0.08,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
      }}
    >
      <View className="h-16 w-16 items-center justify-center rounded-full overflow-hidden">
        {iconAsset ? (
          <Image
            style={{ height: 64, width: 64 }}
            source={iconAsset}
            resizeMode="cover"
          />
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
