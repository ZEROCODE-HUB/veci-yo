import React from 'react';
import { View, Text, Pressable, ScrollView, Modal as RNModal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  showClose?: boolean;
  headerAction?: React.ReactNode;
}

export function Modal({
  visible,
  onClose,
  title,
  children,
  showClose = true,
  headerAction,
}: ModalProps) {
  return (
    <RNModal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable
        onPress={onClose}
        className="flex-1 items-center justify-center px-5"
        style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          className="bg-white rounded-xl w-full max-w-[420px] max-h-[85%] overflow-hidden"
          style={{ margin: 20, alignSelf: 'center' }}
        >
          {title && (
            <View className="flex-row items-center px-5 py-4 border-b border-gray-100">
              {showClose ? (
                <Pressable onPress={onClose} className="mr-3 p-1">
                  <Ionicons name="close" size={20} color="#6B7280" />
                </Pressable>
              ) : (
                <View className="w-8 mr-3" />
              )}
              <Text className="flex-1 text-lg font-bold text-gray-900 text-center">
                {title}
              </Text>
              {headerAction ? (
                <View className="ml-3">{headerAction}</View>
              ) : showClose ? (
                <View className="w-8 ml-3" />
              ) : null}
            </View>
          )}
          <ScrollView
            className="p-5"
            style={{ flexGrow: 0 }}
            contentContainerStyle={{ flexGrow: 1, paddingBottom: 8 }}
            nestedScrollEnabled
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator
          >
            {children}
          </ScrollView>
        </Pressable>
      </Pressable>
    </RNModal>
  );
}
