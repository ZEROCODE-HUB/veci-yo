import { theme } from "@/config";
import React from "react";
import { Image, Text, View, type ImageSourcePropType } from "react-native";
import type { ZonaComun } from "@/shared/types";
import zonaIcons, { zonaBanners } from "@/assets/icons/zonas";

const icons = zonaIcons as Record<string, ImageSourcePropType>;
const banners = zonaBanners as Record<string, ImageSourcePropType>;

export function ZonaBanner({ zona }: { zona: ZonaComun }) {
  return (
    <View
      className="w-full h-44 rounded-2xl overflow-hidden"
      style={{ backgroundColor: theme.colors.zonaSinFoto }}
    >
      {banners[zona.id] ? (
        <Image
          style={{ width: "100%", height: "100%" }}
          source={banners[zona.id]}
          resizeMode="cover"
        />
      ) : icons[zona.id] ? (
        <View className="w-full h-full items-center justify-center">
          <Image
            style={{ width: 80, height: 80 }}
            source={icons[zona.id]}
            resizeMode="contain"
          />
        </View>
      ) : (
        <View className="w-full h-full items-center justify-center">
          <Text className="text-5xl">{zona.emoji}</Text>
        </View>
      )}
      <View
        className="absolute bottom-0 left-0 right-0 px-4 py-3"
        style={{ backgroundColor: theme.colors.veloPieImagen }}
      >
        <Text className="text-xl font-bold text-white">{zona.nombre}</Text>
      </View>
    </View>
  );
}
