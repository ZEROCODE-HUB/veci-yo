import { theme } from "@/config";
import React from "react";
import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface CheckboxProps {
  checked: boolean;
  onChange: (val: boolean) => void;
  label?: string;
  error?: boolean;
}

export function Checkbox({
  checked,
  onChange,
  label,
  error = false,
}: CheckboxProps) {
  const borderColor = error
    ? theme.colors.danger
    : checked
      ? theme.colors.primary
      : theme.colors.border;
  const bgColor = checked ? theme.colors.primary : theme.colors.bgCard;

  return (
    <Pressable
      onPress={() => onChange(!checked)}
      className="flex-row items-start gap-3"
    >
      <View
        className="w-[22px] h-[22px] rounded-sm items-center justify-center border"
        style={{ backgroundColor: bgColor, borderColor }}
      >
        {checked && (
          <Ionicons
            name="checkmark"
            size={14}
            color={theme.colors.textInverse}
          />
        )}
      </View>
      {label && (
        <Text
          className="text-sm text-gray-900 flex-1"
          style={{ lineHeight: 20 }}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}
