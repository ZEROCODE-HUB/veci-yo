import React from 'react';
import { View, Text, Pressable } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';

interface ToggleProps {
  value: boolean;
  onChange: (val: boolean) => void;
  label?: string;
  labelRight?: string;
  labelClassName?: string;
  labelRightClassName?: string;
}

export function Toggle({ value, onChange, label, labelRight, labelClassName = "", labelRightClassName = "" }: ToggleProps) {
  const translateX = useSharedValue(value ? 18 : 2);

  React.useEffect(() => {
    translateX.value = withTiming(value ? 18 : 2, { duration: 200 });
  }, [value]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <View className="flex-row items-center gap-2.5">
      {label && (
        <Text className={`text-sm text-gray-500 ${labelClassName}`}>{label}</Text>
      )}
      <Pressable
        onPress={() => onChange(!value)}
        className="rounded-full w-[44px] h-[26px] justify-center"
        style={{ backgroundColor: value ? '#F5B800' : '#E5E7EB' }}
      >
        <Animated.View
          className="w-5 h-5 rounded-full bg-white shadow-sm"
          style={[animatedStyle]}
        />
      </Pressable>
      {labelRight && (
        <Text className={`text-sm text-gray-500 ${labelRightClassName}`}>{labelRight}</Text>
      )}
    </View>
  );
}
