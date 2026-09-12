import React, { useState } from 'react';
import { View, Text, Pressable, FlatList, Modal as RNModal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface SelectOption {
  value: string | number;
  label: string;
}

interface SelectProps {
  label?: string;
  value: string | number | null;
  options: (string | SelectOption)[];
  onChange: (val: string | number) => void;
  placeholder?: string;
}

export function Select({
  label,
  value,
  options,
  onChange,
  placeholder = 'Seleccione...',
}: SelectProps) {
  const [open, setOpen] = useState(false);

  const normalized: SelectOption[] = options.map((opt) =>
    typeof opt === 'object' && opt !== null && 'value' in opt
      ? opt
      : { value: opt, label: String(opt) }
  );

  const selected = normalized.find((o) => o.value === value);
  const display = selected ? selected.label : placeholder;

  const handleSelect = (opt: SelectOption) => {
    onChange(opt.value);
    setOpen(false);
  };

  return (
    <View className="w-full">
      {label && (
        <Text className="text-sm text-gray-500 mb-1.5 font-medium">{label}</Text>
      )}
      <Pressable
        onPress={() => setOpen(true)}
        className="flex-row items-center justify-between bg-white rounded-2xl px-4 py-3.5 border border-gray-200"
      >
        <Text
          className="flex-1 text-base"
          style={{ color: selected ? '#111827' : '#6B7280' }}
        >
          {display}
        </Text>
        <Ionicons
          name={open ? 'chevron-up' : 'chevron-down'}
          size={22}
          color="#6B7280"
        />
      </Pressable>

      <RNModal
        visible={open}
        transparent
        animationType="slide"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable
          onPress={() => setOpen(false)}
          className="flex-1 justify-end"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            className="bg-white rounded-t-xl max-h-[60%] overflow-hidden"
          >
            <FlatList
              data={normalized}
              keyExtractor={(item) => String(item.value)}
              renderItem={({ item }) => {
                const isSelected = item.value === value;
                return (
                  <Pressable
                    onPress={() => handleSelect(item)}
                    className="px-4 py-3.5 border-b border-gray-100"
                    style={{
                      backgroundColor: isSelected ? '#FFF8E1' : 'transparent',
                    }}
                  >
                    <Text
                      className="text-base"
                      style={{
                        fontWeight: isSelected ? '600' : '400',
                        color: isSelected ? '#111827' : '#6B7280',
                      }}
                    >
                      {item.label}
                    </Text>
                  </Pressable>
                );
              }}
            />
          </Pressable>
        </Pressable>
      </RNModal>
    </View>
  );
}
