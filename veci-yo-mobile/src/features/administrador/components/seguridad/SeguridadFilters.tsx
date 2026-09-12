import { useState } from "react";
import { Button, Select } from "@/shared/components";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";
import { hourRanges, shifts, weekDays } from "../../types";

type Props = {
  filterSchedule: string;
  filterShift: string;
  filterDay: string;
  onScheduleChange: (value: string) => void;
  onShiftChange: (value: string) => void;
  onDayChange: (value: string) => void;
  onClear: () => void;
};

export function SeguridadFilters({
  filterSchedule,
  filterShift,
  filterDay,
  onScheduleChange,
  onShiftChange,
  onDayChange,
  onClear,
}: Props) {
  const [filtersOpen, setFiltersOpen] = useState(false);

  return (
    <View className="rounded-2xl bg-white p-4 gap-3">
      <View className="flex-row gap-2">
        <View className="flex-1">
          <Select
            label="Horarios"
            placeholder="Todos"
            value={filterSchedule}
            options={hourRanges}
            onChange={(value) => onScheduleChange(String(value))}
          />
        </View>
        <View className="flex-1">
          <Select
            label="Turnos"
            placeholder="Todos"
            value={filterShift}
            options={shifts}
            onChange={(value) => onShiftChange(String(value))}
          />
        </View>
      </View>
      <Pressable
        onPress={() => setFiltersOpen((current) => !current)}
        className="flex-row items-center justify-between py-1"
      >
        <Text className="text-sm font-semibold text-gray-700">Días</Text>
        <Ionicons
          name={filtersOpen ? "chevron-up" : "chevron-down"}
          size={19}
          color="#6B7280"
        />
      </Pressable>
      {filtersOpen && (
        <View className="gap-3">
          <Select
            placeholder="Todos"
            value={filterDay}
            options={weekDays}
            onChange={(value) => onDayChange(String(value))}
          />
          <Button variant="ghost" size="sm" onPress={onClear}>
            Limpiar filtros
          </Button>
        </View>
      )}
    </View>
  );
}
