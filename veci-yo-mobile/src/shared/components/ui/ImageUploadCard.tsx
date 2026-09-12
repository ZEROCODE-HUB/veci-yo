import React, { useState } from 'react';
import { View, Text, Pressable, Image } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';

const MAX_SIZE_MB = 8;

interface ImageUploadCardProps {
  label?: string;
  helperText?: string;
  value: string | null;
  onChange: (uri: string) => void;
  placeholder?: string;
  circular?: boolean;
  height?: number;
  error?: string;
}

export function ImageUploadCard({
  label,
  helperText,
  value,
  onChange,
  placeholder = 'Subir imagen',
  circular = false,
  height = 160,
  error = '',
}: ImageUploadCardProps) {
  const [localError, setLocalError] = useState('');

  const openPicker = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      if (asset.fileSize && asset.fileSize > MAX_SIZE_MB * 1024 * 1024) {
        setLocalError(`La imagen no debe superar los ${MAX_SIZE_MB}MB.`);
        return;
      }
      setLocalError('');
      onChange(asset.uri);
    }
  };

  const shownError = error || localError;
  const borderColor = shownError ? '#EF4444' : '#E5E7EB';

  return (
    <View>
      {label && (
        <Text className="text-sm text-gray-500 font-medium mb-2">{label}</Text>
      )}

      <Pressable
        onPress={openPicker}
        style={{
          width: circular ? height : '100%',
          height,
          borderRadius: circular ? 9999 : 20,
          borderWidth: 1.5,
          borderStyle: value ? 'solid' : 'dashed',
          borderColor,
          overflow: 'hidden',
        }}
        className="items-center justify-center"
      >
        {value ? (
          <Image
            source={{ uri: value }}
            style={{ width: '100%', height: '100%' }}
            resizeMode="cover"
          />
        ) : (
          <View className="items-center gap-2">
            <Ionicons name="camera" size={28} color="#9CA3AF" />
            <Text className="text-sm text-gray-500 font-medium">{placeholder}</Text>
          </View>
        )}
      </Pressable>

      <View
        className="flex-row items-center mt-2"
        style={{ justifyContent: circular ? 'center' : 'space-between' }}
      >
        {helperText && !shownError && (
          <Text className="text-xs text-gray-400">{helperText}</Text>
        )}
        {shownError ? (
          <Text className="text-xs text-danger font-medium">{shownError}</Text>
        ) : null}
        {value ? (
          <Pressable onPress={openPicker}>
            <Text className="text-xs font-semibold text-secondary">Reemplazar imagen</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}
