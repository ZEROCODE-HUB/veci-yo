import React, { useState } from "react";
import { View, Text, Pressable } from "react-native";
import type { VisitaItem } from "@/shared/types";
import {
  colorEstadoVisita,
  fechaComparable,
} from "../../helpers/visitas.helpers";
import { Ionicons } from "@expo/vector-icons";

interface CalendarioVisitasProps {
  items: VisitaItem[];
  onSelect: (item: VisitaItem) => void;
}

export function CalendarioVisitas({ items, onSelect }: CalendarioVisitasProps) {
  const [month, setMonth] = useState(() => new Date());
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const firstDay = new Date(year, monthIndex, 1).getDay();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const weekDays = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
  const monthLabel = month.toLocaleDateString("es-ES", {
    month: "long",
    year: "numeric",
  });

  return (
    <View
      className="bg-white rounded-2xl overflow-hidden mt-2"
      style={{
        boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
        borderWidth: 1,
        borderColor: "#F3F4F6",
      }}
    >
      <View className="flex-row items-center justify-between px-3.5 py-3">
        <Pressable
          onPress={() => setMonth(new Date(year, monthIndex - 1, 1))}
          className="w-11 h-11 items-center justify-center"
          accessibilityLabel="Mes anterior"
        >
          <Ionicons name="chevron-back" size={22} color="#111827" />
        </Pressable>
        <Text className="text-base font-bold text-gray-900 capitalize">
          {monthLabel}
        </Text>
        <Pressable
          onPress={() => setMonth(new Date(year, monthIndex + 1, 1))}
          className="w-11 h-11 items-center justify-center"
          accessibilityLabel="Mes siguiente"
        >
          <Ionicons name="chevron-forward" size={22} color="#111827" />
        </Pressable>
      </View>
      <View className="flex-row flex-wrap px-2 pb-2">
        {weekDays.map((day) => (
          <Text
            key={day}
            className="text-center text-xs font-semibold text-gray-400 py-1"
            style={{ width: "14.2857%" }}
          >
            {day}
          </Text>
        ))}
        {Array.from({ length: firstDay }).map((_, index) => (
          <View
            key={`empty-${index}`}
            style={{ width: "14.2857%", height: 76 }}
          />
        ))}
        {Array.from({ length: daysInMonth }).map((_, index) => {
          const day = index + 1;
          const date = `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const dayItems = items.filter(
            (item) => fechaComparable(item.fechaDesde) === date,
          );

          return (
            <View
              key={day}
              className="p-1"
              style={{ width: "14.2857%", height: 76 }}
            >
              <Text className="text-xs text-gray-900">{day}</Text>
              {dayItems.slice(0, 2).map((item) => (
                <Pressable
                  key={item.id}
                  onPress={() => onSelect(item)}
                  className="rounded-full px-1.5 mt-1"
                  style={{ backgroundColor: colorEstadoVisita(item.estado) }}
                >
                  <Text className="text-[10px] text-white" numberOfLines={1}>
                    {item.nombre}
                  </Text>
                </Pressable>
              ))}
            </View>
          );
        })}
      </View>
    </View>
  );
}
