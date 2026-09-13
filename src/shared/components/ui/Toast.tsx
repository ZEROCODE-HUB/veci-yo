import React from 'react';
import { View, Text } from 'react-native';
import { useUIStore } from '@/stores/ui-store';

export function ToastContainer() {
  const toasts = useUIStore((s) => s.toasts);

  if (toasts.length === 0) return null;

  return (
    <View className="absolute bottom-24 left-4 right-4 z-50 flex gap-2">
      {toasts.map((toast) => (
        <View
          key={toast.id}
          className="flex-row items-center gap-2 rounded-xl px-4 py-3 shadow-md"
          style={{
            backgroundColor: toast.type === 'error' ? '#EF4444' : '#111827',
          }}
        >
          <Text className="text-base">
            {toast.type === 'error' ? '⚠️' : '✓'}
          </Text>
          <Text className="text-sm font-medium text-white flex-1">
            {toast.message}
          </Text>
        </View>
      ))}
    </View>
  );
}
