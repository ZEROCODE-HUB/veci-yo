import { theme } from "@/config";
import React, { useState } from "react";
import { View, Text, Pressable } from "react-native";
import type { VisitaItem } from "@/shared/types";
import {
  colorEstadoVisita,
  fechaComparable,
} from "../../helpers/visitas.helpers";
import { Ionicons } from "@expo/vector-icons";
import { formatDateIso, formatMonthYear } from "@/shared/utils";

interface CalendarioVisitasProps {
  items: VisitaItem[];
  onSelect: (item: VisitaItem) => void;
}

const ANCHO_DIA = "14.2857%";

/**
 * Las visitas del mes, por día.
 *
 * Cada celda pintaba hasta dos nombres en letra de 10 px y en una celda de
 * 40 px de ancho no se leía ninguno; la tercera visita del día ni siquiera
 * decía que existía (auditoría de responsividad, 25/10/2026). Ahora la celda
 * dice cuántas hay y, al tocar el día, la lista sale debajo, entera.
 */
export function CalendarioVisitas({ items, onSelect }: CalendarioVisitasProps) {
  const [month, setMonth] = useState(() => new Date());
  const [diaElegido, setDiaElegido] = useState<string | null>(null);
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const firstDay = new Date(year, monthIndex, 1).getDay();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const weekDays = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
  const monthLabel = formatMonthYear(month);

  const cambiarMes = (delta: number) => {
    setMonth(new Date(year, monthIndex + delta, 1));
    setDiaElegido(null);
  };

  const delDia = (fecha: string) =>
    items.filter((item) => fechaComparable(item.fechaDesde) === fecha);
  const visitasDelDia = diaElegido ? delDia(diaElegido) : [];

  return (
    <View
      className="bg-white rounded-2xl overflow-hidden mt-2"
      style={{
        boxShadow: theme.shadows.card,
        borderWidth: 1,
        borderColor: theme.colors.borderLight,
      }}
    >
      <View className="flex-row items-center justify-between px-3.5 py-3">
        <Pressable
          onPress={() => cambiarMes(-1)}
          className="w-11 h-11 items-center justify-center"
          accessibilityLabel="Mes anterior"
        >
          <Ionicons name="chevron-back" size={22} color={theme.colors.text} />
        </Pressable>
        <Text className="text-base font-bold text-gray-900 capitalize">
          {monthLabel}
        </Text>
        <Pressable
          onPress={() => cambiarMes(1)}
          className="w-11 h-11 items-center justify-center"
          accessibilityLabel="Mes siguiente"
        >
          <Ionicons
            name="chevron-forward"
            size={22}
            color={theme.colors.text}
          />
        </Pressable>
      </View>
      <View className="flex-row flex-wrap px-2 pb-2">
        {weekDays.map((day) => (
          <Text
            key={day}
            className="text-center text-xs font-semibold text-gray-400 py-1"
            style={{ width: ANCHO_DIA }}
          >
            {day}
          </Text>
        ))}
        {Array.from({ length: firstDay }).map((_, index) => (
          <View
            key={`empty-${index}`}
            style={{ width: ANCHO_DIA, height: 52 }}
          />
        ))}
        {Array.from({ length: daysInMonth }).map((_, index) => {
          const day = index + 1;
          const date = `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const cuantas = delDia(date).length;
          const elegido = diaElegido === date;

          return (
            <View key={day} style={{ width: ANCHO_DIA, height: 52, padding: 2 }}>
              <Pressable
                onPress={() => setDiaElegido(elegido ? null : date)}
                accessibilityRole="button"
                accessibilityLabel={
                  cuantas === 0
                    ? `Día ${day}, sin visitas`
                    : `Día ${day}, ${cuantas} ${cuantas === 1 ? "visita" : "visitas"}`
                }
                accessibilityState={{ selected: elegido }}
                aria-selected={elegido}
                className="flex-1 items-center justify-center rounded-xl gap-0.5"
                style={{
                  backgroundColor: elegido ? theme.colors.primaryLight : undefined,
                  borderWidth: elegido ? 1.5 : 0,
                  borderColor: theme.colors.primary,
                }}
              >
                <Text className="text-sm text-gray-900">{day}</Text>
                {cuantas > 0 ? (
                  <View
                    className="rounded-full items-center justify-center px-1.5"
                    style={{ minWidth: 20, height: 18, backgroundColor: theme.colors.secondary }}
                  >
                    <Text className="text-xs font-semibold text-white">{cuantas}</Text>
                  </View>
                ) : null}
              </Pressable>
            </View>
          );
        })}
      </View>

      {/* La lista del día tocado, con los nombres enteros. */}
      <View className="px-3.5 pb-3.5 gap-2" style={{ borderTopWidth: 1, borderTopColor: theme.colors.borderLight }}>
        {diaElegido === null ? (
          <Text className="pt-3 text-sm text-gray-500">
            Toca un día para ver sus visitas.
          </Text>
        ) : (
          <>
            <Text className="pt-3 text-sm font-semibold text-gray-900">
              {visitasDelDia.length === 0
                ? `Sin visitas el ${formatDateIso(diaElegido)}`
                : `Visitas del ${formatDateIso(diaElegido)}`}
            </Text>
            {visitasDelDia.map((item) => (
              <Pressable
                key={item.id}
                onPress={() => onSelect(item)}
                accessibilityRole="button"
                className="flex-row items-center gap-2.5 rounded-xl px-3 py-2.5"
                style={{ backgroundColor: theme.colors.bgMuted }}
              >
                <View
                  className="rounded-full"
                  style={{ width: 10, height: 10, backgroundColor: colorEstadoVisita(item.estado) }}
                />
                <Text className="flex-1 text-sm text-gray-900" numberOfLines={1}>
                  {item.nombre}
                </Text>
                <Text className="text-xs text-gray-500">{item.estado}</Text>
                <Ionicons name="chevron-forward" size={16} color={theme.colors.textSecondary} />
              </Pressable>
            ))}
          </>
        )}
      </View>
    </View>
  );
}
