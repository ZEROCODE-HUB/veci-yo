import React from 'react';
import { View, Text, Pressable, Modal as RNModal } from 'react-native';

interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export function BottomSheet({ visible, onClose, children }: BottomSheetProps) {
  return (
    <RNModal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable
        onPress={onClose}
        className="flex-1 justify-end"
        style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          className="bg-white rounded-t-xl overflow-hidden pb-8"
          style={{ boxShadow: '0 -4px 32px rgba(0,0,0,0.15)' }}
        >
          {children}
        </Pressable>
      </Pressable>
    </RNModal>
  );
}

interface BottomSheetOptionProps {
  label: string;
  onPress: () => void;
  variant?: 'default' | 'danger' | 'primary';
  disabled?: boolean;
}

export function BottomSheetOption({
  label,
  onPress,
  variant = 'default',
  disabled = false,
}: BottomSheetOptionProps) {
  const colorMap = {
    default: '#111827',
    danger: '#EF4444',
    primary: '#F5B800',
  };

  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
      className="w-full px-5 py-4 border-b border-gray-100"
      style={{ opacity: disabled ? 0.5 : 1 }}
    >
      <Text
        className="text-base font-medium text-center"
        style={{ color: disabled ? '#9CA3AF' : colorMap[variant] }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
