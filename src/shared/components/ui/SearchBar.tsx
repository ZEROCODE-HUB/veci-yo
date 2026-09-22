import { theme } from "@/config";
import React from 'react';
import { View, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface SearchBarProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
}

export function SearchBar({
  value,
  onChange,
  placeholder = 'Búsqueda',
}: SearchBarProps) {
  return (
    <View className="flex-row items-center bg-white rounded-full px-4 py-2.5 shadow-sm border border-gray-100">
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        className="flex-1 text-base text-gray-900"
        placeholderTextColor={theme.colors.textMuted}
      />
      <Ionicons name="search" size={18} color={theme.colors.textMuted} />
    </View>
  );
}
