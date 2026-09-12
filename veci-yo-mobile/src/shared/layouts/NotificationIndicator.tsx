import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface NotificationIndicatorProps {
  count?: number;
  onPress?: () => void;
}

export function NotificationIndicator({ count = 0, onPress }: NotificationIndicatorProps) {
  return (
    <Pressable onPress={onPress} className="relative">
      <Ionicons name="notifications-outline" size={24} color="#111827" />
      {count > 0 && (
        <View className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-danger items-center justify-center border border-white">
          <Text className="text-2xs font-bold text-white">
            {count > 9 ? '9+' : count}
          </Text>
        </View>
      )}
    </Pressable>
  );
}
