import { theme } from "@/config";
import React, { useState } from "react";
import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { DIAS_INICIALES } from "@/shared/utils";

const DAYS = DIAS_INICIALES;
const MONTHS = [
  "Ene",
  "Feb",
  "Mar",
  "Abr",
  "May",
  "Jun",
  "Jul",
  "Ago",
  "Sep",
  "Oct",
  "Nov",
  "Dic",
];

interface CalendarProps {
  /**
   * El primer dia que se puede elegir. Los anteriores se pintan apagados y no
   * responden.
   *
   * Es opcional a proposito: este calendario tambien sirve para filtrar un
   * historial o elegir un turno, donde el pasado es justo lo que se busca.
   * Solo lo pide quien reserva.
   */
  minima?: Date;
  selected?: Date | null;
  onSelect?: (date: Date) => void;
}

export function Calendar({ selected, onSelect, minima }: CalendarProps) {
  /** Comparacion por dia, no por instante: las horas no cuentan. */
  const anteriorAlMinimo = (d: number | null) => {
    if (!d || !minima) return false;
    const dia = new Date(year, month, d);
    const tope = new Date(
      minima.getFullYear(),
      minima.getMonth(),
      minima.getDate(),
    );
    return dia < tope;
  };

  const today = new Date();
  const [viewDate, setViewDate] = useState(
    selected ? new Date(selected) : today,
  );

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
    return (
      s.getFullYear() === year && s.getMonth() === month && s.getDate() === d
    );
  };

  const isToday = (d: number | null) => {
    return (
      d &&
      today.getFullYear() === year &&
      today.getMonth() === month &&
      today.getDate() === d
    );
  };

  return (
    <View className="bg-white rounded-2xl p-4 shadow-card border border-gray-100">
      <View className="flex-row items-center justify-between mb-3">
        {/* Las dos flechas del calendario: dos chevrones iguales y opuestos,
            y sin nombre ninguna dice hacia donde va. */}
        <Pressable
          onPress={() => setViewDate(new Date(year, month - 1, 1))}
          accessibilityRole="button"
          accessibilityLabel="Mes anterior"
          className="p-1"
        >
          <Ionicons
            name="chevron-back"
            size={22}
            color={theme.colors.textSecondary}
          />
        </Pressable>
        <View className="items-center">
          <Text className="text-danger font-bold text-sm">{year}</Text>
          <Text className="font-semibold text-base text-gray-900">
            {MONTHS[month]}
          </Text>
        </View>
        <Pressable
          onPress={() => setViewDate(new Date(year, month + 1, 1))}
          accessibilityRole="button"
          accessibilityLabel="Mes siguiente"
          className="p-1"
        >
          <Ionicons
            name="chevron-forward"
            size={22}
            color={theme.colors.textSecondary}
          />
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
          const vedado = anteriorAlMinimo(d);
          return (
            <Pressable
              key={i}
              onPress={() =>
                d && !vedado && onSelect?.(new Date(year, month, d))
              }
              disabled={!d || vedado}
              className="w-[14.28%] aspect-square items-center justify-center"
              style={{ opacity: vedado ? 0.3 : 1 }}
            >
              <View
                className="w-8 h-8 rounded-full items-center justify-center"
                style={{
                  backgroundColor: sel ? theme.colors.danger : "transparent",
                }}
              >
                <Text
                  className="text-sm"
                  style={{
                    fontWeight: tod || sel ? "bold" : "normal",
                    color: sel
                      ? theme.colors.textInverse
                      : tod
                        ? theme.colors.danger
                        : d
                          ? theme.colors.text
                          : "transparent",
                  }}
                >
                  {d || ""}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
