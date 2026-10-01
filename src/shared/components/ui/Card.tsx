import React from 'react';
import { View, Pressable } from 'react-native';

interface CardProps {
  children: React.ReactNode;
  onPress?: () => void;
  className?: string;
  style?: object;
}

export function Card({ children, onPress, className = '', style }: CardProps) {
  const baseClass = `bg-white rounded-xl shadow-card ${className}`;

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        className={baseClass}
        style={style}
      >
        {children}
      </Pressable>
    );
  }

  return (
    <View className={baseClass} style={style}>
      {children}
    </View>
  );
}
