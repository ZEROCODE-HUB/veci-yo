import React from "react";
import { useState } from "react";
import { View, Pressable, Text } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import type { DateTimePickerChangeEvent } from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import { SearchBar, Select, Toggle } from "@/shared/components";
import { FILTROS_ESTADO, CATEGORIAS } from "@/data";
import { COLOR_TODOS } from "../helpers/correspondencia.helpers";

interface CorrespondenciaFiltrosProps {
  search: string;
  onSearchChange: (v: string) => void;
  estadoSeleccionados: string[];
  onToggleEstado: (v: string) => void;
  onToggleTodos: () => void;
  todosActivo: boolean;
  filterOpen: boolean;
  onToggleFilterOpen: () => void;
  fechaDesde: string;
  onFechaDesdeChange: (v: string) => void;
  fechaHasta: string;
  onFechaHastaChange: (v: string) => void;
  catFilter: string;
  onCatFilterChange: (v: string) => void;
  entregaFilter: boolean;
  onEntregaFilterChange: (v: boolean) => void;
}

export function CorrespondenciaFiltros({
  search,
  onSearchChange,
  estadoSeleccionados,
  onToggleEstado,
  onToggleTodos,
  todosActivo,
  filterOpen,
  onToggleFilterOpen,
  fechaDesde,
  onFechaDesdeChange,
  fechaHasta,
  onFechaHastaChange,
  catFilter,
  onCatFilterChange,
  entregaFilter,
  onEntregaFilterChange,
}: CorrespondenciaFiltrosProps) {
  const [selectorFecha, setSelectorFecha] = useState<"desde" | "hasta" | null>(null);

  const fechaSeleccionada = selectorFecha === "desde" ? fechaDesde : fechaHasta;
  const fechaParaPicker = fechaSeleccionada
    ? new Date(`${fechaSeleccionada}T00:00:00`)
    : new Date();

  const manejarCambioFecha = (
    _event: DateTimePickerChangeEvent,
    date: Date,
  ) => {
    setSelectorFecha(null);

    const valor = [date.getFullYear(), date.getMonth() + 1, date.getDate()]
      .map((parte) => String(parte).padStart(2, "0"))
      .join("-");

    if (selectorFecha === "desde") onFechaDesdeChange(valor);
    if (selectorFecha === "hasta") onFechaHastaChange(valor);
  };

  const mostrarFecha = (valor: string) =>
    valor
      ? new Date(`${valor}T00:00:00`).toLocaleDateString("es-AR")
      : "Seleccionar fecha";

  return (
    <View
      className="bg-white rounded-xl p-3 gap-2.5"
      style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}
    >
      <SearchBar value={search} onChange={onSearchChange} />

      {/* Status filter chips */}
      <View className="flex-row flex-wrap gap-2 justify-center">
        {FILTROS_ESTADO.map((f) => {
          const sel = estadoSeleccionados.includes(f.value);
          return (
            <Pressable
              key={f.value}
              onPress={() => onToggleEstado(f.value)}
              className="flex-row items-center gap-1.5 rounded-full px-3 py-1.5"
              style={{
                borderWidth: 1.5,
                borderColor: f.color,
                backgroundColor: sel ? f.color : "transparent",
              }}
            >
              <View
                className="w-3.5 h-3.5 rounded items-center justify-center"
                style={{
                  borderWidth: 1.5,
                  borderColor: sel ? "#fff" : f.color,
                  backgroundColor: sel ? "#fff" : "transparent",
                }}
              >
                {sel && (
                  <Text
                    style={{ fontSize: 10, color: f.color, lineHeight: 12 }}
                  >
                    ✓
                  </Text>
                )}
              </View>
              <Text
                className="text-xs font-semibold"
                style={{ color: sel ? "#fff" : f.color }}
              >
                {f.label}
              </Text>
            </Pressable>
          );
        })}
        <Pressable
          onPress={onToggleTodos}
          className="flex-row items-center gap-1.5 rounded-full px-3 py-1.5"
          style={{
            borderWidth: 1.5,
            borderColor: COLOR_TODOS,
            backgroundColor: todosActivo ? COLOR_TODOS : "transparent",
          }}
        >
          <View
            className="w-3.5 h-3.5 rounded items-center justify-center"
            style={{
              borderWidth: 1.5,
              borderColor: todosActivo ? "#fff" : COLOR_TODOS,
              backgroundColor: todosActivo ? "#fff" : "transparent",
            }}
          >
            {todosActivo && (
              <Text
                style={{ fontSize: 10, color: COLOR_TODOS, lineHeight: 12 }}
              >
                ✓
              </Text>
            )}
          </View>
          <Text
            className="text-xs font-semibold"
            style={{ color: todosActivo ? "#fff" : COLOR_TODOS }}
          >
            Todos
          </Text>
        </Pressable>
      </View>

      {/* Filter dropdown toggle */}
      <View className="items-center">
        <Pressable onPress={onToggleFilterOpen} className="p-1">
          <Ionicons
            name="chevron-down"
            size={28}
            color="#6B7280"
            style={{ transform: [{ rotate: filterOpen ? "180deg" : "0deg" }] }}
          />
        </Pressable>
      </View>

      {/* Advanced filters */}
      {filterOpen && (
        <View className="gap-2.5">
          <View className="flex-row gap-3">
            <View className="flex-1">
              <Text className="text-sm text-gray-500 mb-1">Fecha desde</Text>
              <Pressable
                onPress={() => setSelectorFecha("desde")}
                className="rounded-2xl px-3.5 py-3 flex-row items-center justify-between"
                style={{
                  borderWidth: 1.5,
                  borderColor: "#E5E7EB",
                  backgroundColor: "#FFFFFF",
                }}
              >
                <Text className="text-base text-gray-700">
                  {mostrarFecha(fechaDesde)}
                </Text>
                <Ionicons name="calendar-outline" size={18} color="#6B7280" />
              </Pressable>
            </View>
            <View className="flex-1">
              <Text className="text-sm text-gray-500 mb-1">Fecha hasta</Text>
              <Pressable
                onPress={() => setSelectorFecha("hasta")}
                className="rounded-2xl px-3.5 py-3 flex-row items-center justify-between"
                style={{
                  borderWidth: 1.5,
                  borderColor: "#E5E7EB",
                  backgroundColor: "#FFFFFF",
                }}
              >
                <Text className="text-base text-gray-700">
                  {mostrarFecha(fechaHasta)}
                </Text>
                <Ionicons name="calendar-outline" size={18} color="#6B7280" />
              </Pressable>
            </View>
          </View>
          <Select
            label="Categoría"
            value={catFilter || null}
            options={["Todas", ...CATEGORIAS]}
            onChange={(v) => onCatFilterChange(v === "Todas" ? "" : String(v))}
          />
          <Toggle
            value={entregaFilter}
            onChange={onEntregaFilterChange}
            labelRight="Entrega en puerta"
          />
        </View>
      )}

      {selectorFecha && (
        <DateTimePicker
          value={fechaParaPicker}
          mode="date"
          display="default"
          onValueChange={manejarCambioFecha}
          onDismiss={() => setSelectorFecha(null)}
        />
      )}
    </View>
  );
}
