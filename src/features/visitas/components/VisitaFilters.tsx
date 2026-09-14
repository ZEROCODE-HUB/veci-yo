import React from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { SearchBar, Input, Select, StatusTabs } from "@/shared/components";
import {
  TORRES,
  DEPARTAMENTOS,
  TIPO_LABELS,
  TIPOS_VISITA,
} from "@/data";
import { formatDate } from "@/shared/utils";

interface VisitaFiltersProps {
  search: string;
  onSearchChange: (v: string) => void;
  activeTab: string | null;
  onTabChange: (v: string | null) => void;
  showStatusTabs?: boolean;
  filterOpen: boolean;
  onToggleFilterOpen: () => void;
  fechaDesde: string;
  onFechaDesdeChange: (v: string) => void;
  fechaHasta: string;
  onFechaHastaChange: (v: string) => void;
  tipoFilter: string;
  onTipoFilterChange: (v: string) => void;
  torreFilter: string;
  onTorreFilterChange: (v: string) => void;
  deptoFilter: string;
  onDeptoFilterChange: (v: string) => void;
  canFilterTower?: boolean;
  showCategoriaFilter?: boolean;
  algumFiltroAtivo?: boolean;
  onLimpiarFiltros?: () => void;
}

function chipFecha(activo: boolean) {
  return {
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 9999,
    borderWidth: 1.5,
    borderColor: activo ? "#F5B800" : "#E5E7EB",
    backgroundColor: activo ? "#F5B800" : "transparent",
  };
}

export function VisitaFilters({
  search,
  onSearchChange,
  activeTab,
  onTabChange,
  showStatusTabs = false,
  filterOpen,
  onToggleFilterOpen,
  fechaDesde,
  onFechaDesdeChange,
  fechaHasta,
  onFechaHastaChange,
  tipoFilter,
  onTipoFilterChange,
  torreFilter,
  onTorreFilterChange,
  deptoFilter,
  onDeptoFilterChange,
  canFilterTower = false,
  showCategoriaFilter = true,
  algumFiltroAtivo = false,
  onLimpiarFiltros,
}: VisitaFiltersProps) {
  const [datePicker, setDatePicker] = React.useState<"desde" | "hasta" | null>(
    null,
  );
  const hoy = new Date().toISOString().slice(0, 10);
  const manana = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  const dateValue = (value: string) => {
    if (!value) return new Date();
    const [year, month, day] = value.split("-").map(Number);
    return new Date(year, month - 1, day);
  };

  return (
    <View
      className="rounded-2xl p-3 gap-2.5"
      style={{
        backgroundColor: "#FFFFFF",
        boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
      }}
    >
      <SearchBar
        value={search}
        onChange={onSearchChange}
        placeholder="Buscar por nombre, CI..."
      />

      {/* Status tabs — only for HT tab */}
      {showStatusTabs && (
        <View className="mt-2">
          <StatusTabs
            tabs={["Todas", "Pendiente", "Aceptado", "Ingresado"]}
            active={activeTab}
            onChange={onTabChange}
            centered
          />
        </View>
      )}

      {/* Filter toggle */}
      <View className="items-center">
        <Pressable
          onPress={onToggleFilterOpen}
          className="w-11 h-11 rounded-full items-center justify-center"
          style={{ backgroundColor: "#F9FAFB" }}
        >
          <Ionicons
            name="chevron-down"
            size={24}
            color="#6B7280"
            style={{ transform: [{ rotate: filterOpen ? "180deg" : "0deg" }] }}
          />
        </Pressable>
      </View>

      {/* Advanced filters */}
      {filterOpen && (
        <View className="gap-2.5 mt-2">
          {/* Category filter — only for visitas tab */}
          {showCategoriaFilter && (
            <Select
              label="Categoría"
              value={tipoFilter || null}
              options={[
                "Todos",
                ...TIPOS_VISITA.map((t) => TIPO_LABELS[t] || t),
              ]}
              onChange={(v) =>
                onTipoFilterChange(v === "Todos" ? "" : String(v))
              }
            />
          )}

          {/* Date quick chips + date range */}
          <View className="gap-2">
            <View className="flex-row gap-2 w-full">
              <Pressable
                onPress={() => {
                  onFechaDesdeChange(hoy);
                  onFechaHastaChange(hoy);
                }}
                style={chipFecha(fechaDesde === hoy && fechaHasta === hoy)}
                className="w-[50%]"
              >
                <Text
                  className="text-xs font-semibold text-center"
                  style={{
                    color:
                      fechaDesde === hoy && fechaHasta === hoy
                        ? "#fff"
                        : "#6B7280",
                  }}
                >
                  Hoy
                </Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  onFechaDesdeChange(manana);
                  onFechaHastaChange(manana);
                }}
                style={chipFecha(false)}
                className="w-[50%]"
              >
                <Text
                  className="text-xs font-semibold text-center"
                  style={{ color: "#6B7280" }}
                >
                  Mañana
                </Text>
              </Pressable>
            </View>
            <View>
              <Text className="text-xs text-gray-500 mb-1">Fecha desde</Text>
              <Pressable
                onPress={() => setDatePicker("desde")}
                className="rounded-2xl px-3.5 py-3 flex-row items-center justify-between"
                style={{
                  borderWidth: 1.5,
                  borderColor: "#E5E7EB",
                  backgroundColor: "#FFFFFF",
                }}
              >
                <Text
                  className={
                    fechaDesde
                      ? "text-sm text-gray-900"
                      : "text-sm text-gray-400"
                  }
                >
                  {fechaDesde || "dd/mm/aaaa"}
                </Text>
                <Ionicons name="calendar-outline" size={18} color="#6B7280" />
              </Pressable>
            </View>
            <View>
              <Text className="text-xs text-gray-500 mb-1">Fecha hasta</Text>
              <Pressable
                onPress={() => setDatePicker("hasta")}
                className="rounded-2xl px-3.5 py-3 flex-row items-center justify-between"
                style={{
                  borderWidth: 1.5,
                  borderColor: "#E5E7EB",
                  backgroundColor: "#FFFFFF",
                }}
              >
                <Text
                  className={
                    fechaHasta
                      ? "text-sm text-gray-900"
                      : "text-sm text-gray-400"
                  }
                >
                  {fechaHasta || "dd/mm/aaaa"}
                </Text>
                <Ionicons name="calendar-outline" size={18} color="#6B7280" />
              </Pressable>
            </View>
          </View>

          {datePicker && (
            <DateTimePicker
              value={dateValue(
                datePicker === "desde" ? fechaDesde : fechaHasta,
              )}
              mode="date"
              display="default"
              onValueChange={(_, date) => {
                setDatePicker(null);
                if (!date) return;
                const value = formatDate(date);
                if (datePicker === "desde") onFechaDesdeChange(value);
                else onFechaHastaChange(value);
              }}
              onDismiss={() => setDatePicker(null)}
            />
          )}

          {/* Tower/dept filters — guardia/admin only */}
          {canFilterTower && (
            <View className="flex-row gap-2">
              <View className="flex-1">
                <Select
                  label="Torre"
                  value={torreFilter || null}
                  options={["", ...TORRES]}
                  onChange={(v) => onTorreFilterChange(String(v))}
                  placeholder="Torre"
                />
              </View>
              <View className="flex-1">
                <Select
                  label="Departamento"
                  value={deptoFilter || null}
                  options={["", ...DEPARTAMENTOS]}
                  onChange={(v) => onDeptoFilterChange(String(v))}
                  placeholder="Depto"
                />
              </View>
            </View>
          )}
        </View>
      )}

      {/* Limpiar filtros */}
      {algumFiltroAtivo && (
        <Pressable
          onPress={onLimpiarFiltros}
          className="self-center mt-2 px-4 py-2 rounded-full"
          style={{
            backgroundColor: "#F9FAFB",
            borderWidth: 1,
            borderColor: "#E5E7EB",
          }}
        >
          <Text className="text-xs text-gray-500">Limpiar filtros</Text>
        </Pressable>
      )}
    </View>
  );
}
