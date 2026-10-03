import { theme } from "@/config";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { CampoFecha, SearchBar, Select, Toggle } from "@/shared/components";
import { formatDateInput, parseFechaIso } from "@/shared/utils";
import { anunciosCategorias } from "../../types/anuncios";
import type { AnunciosFiltros } from "../../types/anuncios";

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
  /*
    El filtro guarda `Date`; `CampoFecha` habla ISO, que es como viaja a la
    base. Se traduce en el borde, con los ayudantes compartidos: la vuelta se
    hace por partes porque `new Date("2026-11-10")` se lee como UTC y al oeste
    de Greenwich cae el dia anterior.
  */
  const comoIso = (fecha: Date | null) => (fecha ? formatDateInput(fecha) : "");

  return (
    <View
      className="rounded-2xl p-3"
      style={{
        backgroundColor: theme.colors.bgCard,
        shadowColor: theme.colors.shadow,
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
          accessibilityLabel={abierto ? "Ocultar los filtros" : "Ver los filtros"}
          onPress={() => setAbierto((value) => !value)}
          className="items-center justify-center rounded-full"
          style={{
            width: 52,
            height: 52,
            backgroundColor: theme.colors.borderLight,
            transform: [{ rotate: abierto ? "180deg" : "0deg" }],
          }}
        >
          <Text style={{ fontSize: 32, color: theme.colors.textSecondary }}>
            ▾
          </Text>
        </Pressable>
      </View>
      {abierto && (
        <View className="gap-2.5 mt-2">
          <View className="gap-2">
            {/*
              Dos `CampoFecha` donde habia dos `Pressable` y un
              `DateTimePicker` que en web devuelve `null`: filtrar anuncios por
              fecha no se podia.
            */}
            <CampoFecha
              label="Fecha desde"
              value={comoIso(filtros.fechaDesde)}
              onChange={(iso) => onChange("fechaDesde", parseFechaIso(iso))}
              placeholder="Seleccionar fecha"
            />
            <CampoFecha
              label="Fecha hasta"
              value={comoIso(filtros.fechaHasta)}
              onChange={(iso) => onChange("fechaHasta", parseFechaIso(iso))}
              placeholder="Seleccionar fecha"
            />
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
    </View>
  );
}
