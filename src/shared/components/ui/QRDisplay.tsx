import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useUIStore } from '@/stores/ui-store';
import * as Clipboard from 'expo-clipboard';

interface QRDisplayProps {
  url: string;
  size?: number;
}

export function QRDisplay({ url, size = 180 }: QRDisplayProps) {
  const addToast = useUIStore((s) => s.addToast);

  const handleCopy = async () => {
    await Clipboard.setStringAsync(url);
    addToast('URL copiada', 'success');
  };

  return (
    <View className="items-center gap-3">
      <View
        className="bg-black rounded-lg items-center justify-center overflow-hidden"
        style={{ width: size, height: size }}
      >
        <View className="w-full h-full bg-gray-800 items-center justify-center">
          <Text className="text-white text-xs text-center px-2">QR</Text>
        </View>
      </View>

      {url ? (
        <View className="flex-row items-center bg-gray-50 rounded-xl px-3.5 py-2.5 gap-2.5 w-full">
          <Text className="flex-1 text-xs text-gray-500" numberOfLines={1}>
            {url}
          </Text>
          <Pressable onPress={handleCopy} className="flex-row items-center gap-1.5">
            <Ionicons name="copy-outline" size={18} color="#6B7280" />
            <Text className="text-xs font-medium text-gray-500">Copiar QR</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}
