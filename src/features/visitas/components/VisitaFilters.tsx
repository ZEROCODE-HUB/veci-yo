import { theme } from "@/config";
import React from "react";
import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { CampoFecha, SearchBar, Select, StatusTabs } from "@/shared/components";
import { TIPO_LABELS, TIPOS_VISITA } from "../constants";
import { useUnidadesDisponibles } from "@/shared/hooks";

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
    borderColor: activo ? theme.colors.primary : theme.colors.border,
    backgroundColor: activo ? theme.colors.primary : "transparent",
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
  // `TORRES` era ['Torre 1','Torre 2','Torre 3'] fijo, asi que se podia filtrar
  // por una torre que no existe en este condominio.
  const { codigosDe, torres } = useUnidadesDisponibles();
  const hoy = new Date().toISOString().slice(0, 10);
  const manana = new Date(Date.now() + 86400000).toISOString().slice(0, 10);

  return (
    <View
      className="rounded-2xl p-3 gap-2.5"
      style={{
        backgroundColor: theme.colors.bgCard,
        boxShadow: theme.shadows.card,
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
            tabs={["Todas", "Programada", "Ingresado", "Finalizado"]}
            active={activeTab}
            onChange={onTabChange}
            centered
          />
        </View>
      )}

      {/* Filter toggle */}
      <View className="items-center">
        {/*
          El boton solo lleva un icono, asi que sin etiqueta no anuncia nada:
          un lector de pantalla lee «boton» y ya. Y `aria-expanded` dice si lo
          que despliega esta abierto, que es la otra mitad de la informacion.
        */}
        <Pressable
          onPress={onToggleFilterOpen}
          accessibilityRole="button"
          accessibilityLabel={filterOpen ? "Ocultar filtros" : "Mostrar filtros"}
          aria-expanded={filterOpen}
          className="w-11 h-11 rounded-full items-center justify-center"
          style={{ backgroundColor: theme.colors.bgMuted }}
        >
          <Ionicons
            name="chevron-down"
            size={24}
            color={theme.colors.textSecondary}
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
                        ? theme.colors.textInverse
                        : theme.colors.textSecondary,
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
                  style={{ color: theme.colors.textSecondary }}
                >
                  Mañana
                </Text>
              </Pressable>
            </View>
            {/*
              Dos `CampoFecha` donde habia dos `Pressable` y un
              `DateTimePicker` que en web no pinta nada: el paquete no tiene
              implementacion para navegador y devuelve `null`. El filtro por
              fecha no se podia usar.

              Y de paso se arregla un segundo fallo que vivia debajo: estos dos
              guardaban `dd/MM/yyyy` mientras `useVisitasHistorial` los compara
              contra `toComparableDate`, que devuelve ISO. Aunque el calendario
              se hubiera abierto, el filtro no habria filtrado. `CampoFecha`
              habla ISO hacia fuera, que es el formato con el que se compara.
            */}
            <CampoFecha
              label="Fecha desde"
              value={fechaDesde}
              onChange={onFechaDesdeChange}
              placeholder="dd/mm/aaaa"
            />
            <CampoFecha
              label="Fecha hasta"
              value={fechaHasta}
              onChange={onFechaHastaChange}
              placeholder="dd/mm/aaaa"
            />
          </View>

          {/* Tower/dept filters — guardia/admin only */}
          {canFilterTower && (
            <View className="flex-row gap-2">
              <View className="flex-1">
                <Select
                  label="Torre"
                  value={torreFilter || null}
                  options={["", ...torres]}
                  onChange={(v) => onTorreFilterChange(String(v))}
                  placeholder="Torre"
                />
              </View>
              <View className="flex-1">
                <Select
                  label="Departamento"
                  value={deptoFilter || null}
                  options={["", ...codigosDe()]}
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
            backgroundColor: theme.colors.bgMuted,
            borderWidth: 1,
            borderColor: theme.colors.border,
          }}
        >
          <Text className="text-xs text-gray-500">Limpiar filtros</Text>
        </Pressable>
      )}
    </View>
  );
}
