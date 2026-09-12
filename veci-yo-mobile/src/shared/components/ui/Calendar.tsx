import React, { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTHS = [
  'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
  'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic',
];

interface CalendarProps {
  selected?: Date | null;
  onSelect?: (date: Date) => void;
}

export function Calendar({ selected, onSelect }: CalendarProps) {
  const today = new Date();
  const [viewDate, setViewDate] = useState(selected ? new Date(selected) : today);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const isSelected = (d: number | null) => {
    if (!selected || !d) return false;
    const s = new Date(selected);
    return s.getFullYear() === year && s.getMonth() === month && s.getDate() === d;
  };

  const isToday = (d: number | null) => {
    return d && today.getFullYear() === year && today.getMonth() === month && today.getDate() === d;
  };

  return (
    <View className="bg-white rounded-2xl p-4 shadow-card border border-gray-100">
      <View className="flex-row items-center justify-between mb-3">
        <Pressable onPress={() => setViewDate(new Date(year, month - 1, 1))} className="p-1">
          <Ionicons name="chevron-back" size={22} color="#6B7280" />
        </Pressable>
        <View className="items-center">
          <Text className="text-danger font-bold text-sm">{year}</Text>
          <Text className="font-semibold text-base text-gray-900">{MONTHS[month]}</Text>
        </View>
        <Pressable onPress={() => setViewDate(new Date(year, month + 1, 1))} className="p-1">
          <Ionicons name="chevron-forward" size={22} color="#6B7280" />
        </Pressable>
      </View>

      <View className="flex-row">
        {DAYS.map((d, i) => (
          <View key={i} className="flex-1 items-center py-1">
            <Text className="text-xs font-semibold text-gray-400">{d}</Text>
          </View>
        ))}
      </View>

      <View className="flex-row flex-wrap">
        {cells.map((d, i) => {
          const sel = isSelected(d);
          const tod = isToday(d);
          return (
            <Pressable
              key={i}
              onPress={() => d && onSelect?.(new Date(year, month, d))}
              disabled={!d}
              className="w-[14.28%] aspect-square items-center justify-center"
            >
              <View
                className="w-8 h-8 rounded-full items-center justify-center"
                style={{
                  backgroundColor: sel ? '#EF4444' : 'transparent',
                }}
              >
                <Text
                  className="text-sm"
                  style={{
                    fontWeight: (tod || sel) ? 'bold' : 'normal',
                    color: sel
                      ? '#fff'
                      : tod
                        ? '#EF4444'
                        : d
                          ? '#111827'
                          : 'transparent',
                  }}
                >
                  {d || ''}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
