import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import type { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import { SearchBar, Select, Toggle } from "@/shared/components";
import { anunciosCategorias } from "../../types/anuncios";
import type { AnunciosFiltros } from "../../types/anuncios";
import { formatAnuncioDate } from "../../types/anuncios";

export function AnunciosFilters({
  filtros,
  onChange,
  mostrarEncuesta,
}: {
  filtros: AnunciosFiltros;
  onChange: <K extends keyof AnunciosFiltros>(
    key: K,
    value: AnunciosFiltros[K],
  ) => void;
  mostrarEncuesta: boolean;
}) {
  const [abierto, setAbierto] = useState(false);
  const [selector, setSelector] = useState<"desde" | "hasta" | null>(null);
  const onDateChange = (_event: DateTimePickerEvent, date?: Date) => {
    setSelector(null);
    if (date)
      onChange(selector === "desde" ? "fechaDesde" : "fechaHasta", date);
  };
  return (
    <View
      className="rounded-2xl p-3"
      style={{
        backgroundColor: "#fff",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
      }}
    >
      <SearchBar
        value={filtros.search}
        onChange={(value) => onChange("search", value)}
      />
      <View className="items-center mt-2.5">
        <Pressable
          onPress={() => setAbierto((value) => !value)}
          className="items-center justify-center rounded-full"
          style={{
            width: 52,
            height: 52,
            backgroundColor: "#F3F4F6",
            transform: [{ rotate: abierto ? "180deg" : "0deg" }],
          }}
        >
          <Text style={{ fontSize: 32, color: "#6B7280" }}>▾</Text>
        </Pressable>
      </View>
      {abierto && (
        <View className="gap-2.5 mt-2">
          <View className="gap-2">
            <View>
              <Text className="text-sm text-gray-500 mb-1">Fecha desde</Text>
              <Pressable
                onPress={() => setSelector("desde")}
                className="rounded-2xl px-3.5 py-3 flex-row items-center justify-between"
                style={{
                  borderWidth: 1.5,
                  borderColor: "#E5E7EB",
                  backgroundColor: "#FFFFFF",
                }}
              >
                <Text className="text-base text-gray-700">
                  {formatAnuncioDate(filtros.fechaDesde)}
                </Text>
                <Ionicons name="calendar-outline" size={18} color="#6B7280" />
              </Pressable>
            </View>
            <View>
              <Text className="text-sm text-gray-500 mb-1">Fecha hasta</Text>
              <Pressable
                onPress={() => setSelector("hasta")}
                className="rounded-2xl px-3.5 py-3 flex-row items-center justify-between"
                style={{
                  borderWidth: 1.5,
                  borderColor: "#E5E7EB",
                  backgroundColor: "#FFFFFF",
                }}
              >
                <Text className="text-base text-gray-700">
                  {formatAnuncioDate(filtros.fechaHasta)}
                </Text>
                <Ionicons name="calendar-outline" size={18} color="#6B7280" />
              </Pressable>
            </View>
          </View>
          <View className="flex-row gap-2 items-center">
            <View className="flex-1">
              <Select
                label="Categoria"
                value={filtros.categoria || "Todas"}
                options={["Todas", ...anunciosCategorias]}
                onChange={(value) =>
                  onChange(
                    "categoria",
                    String(value) === "Todas" ? "" : String(value),
                  )
                }
                placeholder="Todas"
              />
            </View>
            {mostrarEncuesta && (
              <View className="flex-1 items-end pt-6">
                <Toggle
                  value={filtros.encuestaActiva}
                  onChange={(value) => onChange("encuestaActiva", value)}
                  labelRight="Encuesta"
                />
              </View>
            )}
          </View>
        </View>
      )}
      {selector && (
        <DateTimePicker
          value={
            (selector === "desde" ? filtros.fechaDesde : filtros.fechaHasta) ||
            new Date()
          }
          mode="date"
          display="default"
          onChange={onDateChange}
        />
      )}
    </View>
  );
}
