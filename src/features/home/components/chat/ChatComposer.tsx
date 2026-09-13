import React from 'react';
import { View, TextInput, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ChatComposerProps {
  value: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
}

export function ChatComposer({ value, onChangeText, onSend }: ChatComposerProps) {
  return (
    <View
      className="flex-row items-center gap-2.5 px-4 py-3"
      style={{
        backgroundColor: '#FFFFFF',
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
      }}
    >
      <TextInput
        value={value}
        onChangeText={onChangeText}
        onSubmitEditing={onSend}
        placeholder="Escribe un mensaje..."
        placeholderTextColor="#9CA3AF"
        className="flex-1 text-base text-gray-900"
        style={{ padding: 0 }}
      />
      <Pressable
        onPress={onSend}
        className="w-11 h-11 rounded-full items-center justify-center"
        style={{ backgroundColor: '#F5B800' }}
      >
        <Ionicons name="send" size={18} color="white" />
      </Pressable>
    </View>
  );
}
