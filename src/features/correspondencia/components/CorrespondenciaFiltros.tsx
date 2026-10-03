import { theme } from "@/config";
import React from "react";
import { View, Pressable, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { CampoFecha, SearchBar, Select, Toggle } from "@/shared/components";
import { FILTROS_ESTADO, CATEGORIAS } from "../constants";
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
  return (
    <View
      className="bg-white rounded-xl p-3 gap-2.5"
      style={{ boxShadow: theme.shadows.card }}
    >
      <SearchBar value={search} onChange={onSearchChange} />

      {/* Status filter chips */}
      <View className="flex-row flex-wrap gap-2 justify-center">
        {FILTROS_ESTADO.map((f) => {
          const sel = estadoSeleccionados.includes(f.value);
          return (
            <Pressable
              key={f.value}
              /*
                Son casillas, no botones: se pueden marcar varias a la vez. Que
                una estuviera marcada se veia **solo** en el color del fondo y en
                un «✓» diminuto, asi que un lector de pantalla anunciaba las
                cuatro igual y quien no ve la interfaz no sabia por que estaba
                filtrando.

                `aria-checked` aparte de `accessibilityState` porque
                react-native-web 0.21 no lo traduce.
              */
              accessibilityRole="checkbox"
              accessibilityState={{ checked: sel }}
              aria-checked={sel}
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
                  borderColor: sel ? theme.colors.bgCard : f.color,
                  backgroundColor: sel ? theme.colors.bgCard : "transparent",
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
                style={{ color: sel ? theme.colors.textInverse : f.color }}
              >
                {f.label}
              </Text>
            </Pressable>
          );
        })}
        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: todosActivo }}
          aria-checked={todosActivo}
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
              borderColor: todosActivo ? theme.colors.bgCard : COLOR_TODOS,
              backgroundColor: todosActivo
                ? theme.colors.bgCard
                : "transparent",
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
            style={{
              color: todosActivo ? theme.colors.textInverse : COLOR_TODOS,
            }}
          >
            Todos
          </Text>
        </Pressable>
      </View>

      {/* Filter dropdown toggle */}
      <View className="items-center">
        <Pressable
          onPress={onToggleFilterOpen}
          accessibilityRole="button"
          /* Y dice si esta abierto: la flecha gira, pero eso no se oye. */
          accessibilityLabel={filterOpen ? "Ocultar filtros" : "Mostrar filtros"}
          accessibilityState={{ expanded: filterOpen }}
          className="p-1"
        >
          <Ionicons
            name="chevron-down"
            size={28}
            color={theme.colors.textSecondary}
            style={{ transform: [{ rotate: filterOpen ? "180deg" : "0deg" }] }}
          />
        </Pressable>
      </View>

      {/* Advanced filters */}
      {filterOpen && (
        <View className="gap-2.5">
          <View className="flex-row gap-3">
            {/*
              Dos `CampoFecha` donde habia dos `Pressable` y un
              `DateTimePicker` que en web devuelve `null`: el filtro por fecha de
              la correspondencia no se podia abrir. Aqui el valor ya viajaba en
              ISO, que es lo que `CampoFecha` habla, asi que no hay que traducir
              nada.
            */}
            <View className="flex-1">
              <CampoFecha
                label="Fecha desde"
                value={fechaDesde}
                onChange={onFechaDesdeChange}
                placeholder="Seleccionar fecha"
              />
            </View>
            <View className="flex-1">
              <CampoFecha
                label="Fecha hasta"
                value={fechaHasta}
                onChange={onFechaHastaChange}
                placeholder="Seleccionar fecha"
              />
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

    </View>
  );
}
