import { theme } from "@/config";
import { Pressable, Text, View } from "react-native";
import { SearchBar, Select } from "@/shared/components";

export type PestanaDelDirectorio = "departamentos" | "estacionamientos" | "depositos" | "residentes";

const PESTANAS: { key: PestanaDelDirectorio; label: string }[] = [
  { key: "departamentos", label: "Departamentos" },
  // Una persona por fila (16/11/2026, cliente: «poder filtrar por […] residentes»).
  { key: "residentes", label: "Residentes" },
  { key: "estacionamientos", label: "Estacionamientos" },
  { key: "depositos", label: "Depósitos" },
];

export function DirectorioFiltros({
  search,
  onSearch,
  torre,
  torres,
  onTorre,
  subTab,
  onSubTab,
  soloRentaCorta,
  onSoloRentaCorta,
  piso,
  pisos,
  onPiso,
  soloSinPropietario,
  onSoloSinPropietario,
  nivel,
  niveles,
  onNivel,
}: {
  search: string;
  onSearch: (value: string) => void;
  torre: string;
  torres: string[];
  onTorre: (value: string) => void;
  subTab: PestanaDelDirectorio;
  onSubTab: (value: PestanaDelDirectorio) => void;
  /** Solo las viviendas con renta corta (Correcciones, 06/11/2026). */
  soloRentaCorta: boolean;
  onSoloRentaCorta: (value: boolean) => void;
  /** Piso, sin propietario y nivel (16/11/2026). */
  piso: string;
  pisos: string[];
  onPiso: (value: string) => void;
  soloSinPropietario: boolean;
  onSoloSinPropietario: (value: boolean) => void;
  nivel: string;
  /** Los niveles que tienen algún estacionamiento; sin ninguno, no hay filtro. */
  niveles: string[];
  onNivel: (value: string) => void;
}) {
  return (
    <>
      <SearchBar
        value={search}
        onChange={onSearch}
        // Corto, para que quepa en una línea en el celular (Para Claude 184).
        placeholder="Buscar depto, persona, código o placa"
      />
      <Select
        value={torre}
        options={[
          { value: "", label: "Todas las torres" },
          ...torres.map((item) => ({ value: item, label: item })),
        ]}
        onChange={(value) => onTorre(String(value))}
        placeholder="Filtrar por torre"
      />
      <View
        style={{
          flexDirection: "row",
          gap: 6,
          justifyContent: "center",
          flexWrap: "wrap",
        }}
      >
        {PESTANAS.map((item) => (
          <Pressable
            key={item.key}
            onPress={() => onSubTab(item.key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: subTab === item.key }}
            aria-selected={subTab === item.key}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 999,
              borderWidth: 1.5,
              borderColor:
                subTab === item.key
                  ? theme.colors.primary
                  : theme.colors.border,
              backgroundColor:
                subTab === item.key
                  ? theme.colors.primary
                  : theme.colors.bgCard,
            }}
          >
            <Text
              className="text-xs font-semibold"
              style={{
                color:
                  subTab === item.key
                    ? theme.colors.textInverse
                    : theme.colors.textSecondary,
              }}
            >
              {item.label}
            </Text>
          </Pressable>
        ))}
      </View>
      {subTab === "departamentos" ? (
        <>
          {pisos.length > 1 ? (
            <Select
              value={piso}
              options={[
                { value: "", label: "Todos los pisos" },
                ...pisos.map((p) => ({ value: p, label: `Piso ${p}` })),
              ]}
              onChange={(value) => onPiso(String(value))}
              placeholder="Filtrar por piso"
            />
          ) : null}
          <View style={{ flexDirection: "row", justifyContent: "center", gap: 6, flexWrap: "wrap" }}>
            <Chip
              texto="Renta corta"
              activo={soloRentaCorta}
              onPress={() => onSoloRentaCorta(!soloRentaCorta)}
            />
            <Chip
              texto="Sin propietario"
              activo={soloSinPropietario}
              onPress={() => onSoloSinPropietario(!soloSinPropietario)}
            />
          </View>
        </>
      ) : null}
      {subTab === "estacionamientos" && niveles.length > 0 ? (
        <Select
          value={nivel}
          options={[
            { value: "", label: "Todos los niveles" },
            ...niveles.map((n) => ({ value: n, label: n })),
          ]}
          onChange={(value) => onNivel(String(value))}
          placeholder="Filtrar por nivel"
        />
      ) : null}
      <Text className="text-xs text-gray-400 text-center">
        Solo consulta — la edición se hace en Arquitectura
      </Text>
    </>
  );
}

function Chip({ texto, activo, onPress }: { texto: string; activo: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: activo }}
      aria-checked={activo}
      style={{
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 999,
        borderWidth: 1.5,
        borderColor: activo ? theme.colors.primary : theme.colors.border,
        backgroundColor: activo ? theme.colors.primaryLight : theme.colors.bgCard,
      }}
    >
      <Text
        className="text-xs font-semibold"
        style={{ color: activo ? theme.colors.text : theme.colors.textSecondary }}
      >
        {activo ? `✓ ${texto}` : texto}
      </Text>
    </Pressable>
  );
}
