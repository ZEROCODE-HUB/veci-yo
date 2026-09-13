import React from 'react';
import { Image, Text, View } from 'react-native';
import type { ZonaComun } from '@/shared/types';
import zonaIcons, { zonaBanners } from '@/assets/icons/zonas';

const icons = zonaIcons as Record<string, any>;
const banners = zonaBanners as Record<string, any>;

export function ZonaBanner({ zona }: { zona: ZonaComun }) {
  return (
    <View className="w-full h-44 rounded-2xl overflow-hidden" style={{ backgroundColor: '#B8A98C' }}>
      {banners[zona.id] ? (
        <Image source={banners[zona.id]} className="w-full h-full" resizeMode="cover" />
      ) : icons[zona.id] ? (
        <View className="w-full h-full items-center justify-center"><Image source={icons[zona.id]} className="w-20 h-20" resizeMode="contain" /></View>
      ) : (
        <View className="w-full h-full items-center justify-center"><Text className="text-5xl">{zona.emoji}</Text></View>
      )}
      <View className="absolute bottom-0 left-0 right-0 px-4 py-3" style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}>
        <Text className="text-xl font-bold text-white">{zona.nombre}</Text>
      </View>
    </View>
  );
}
