import { theme } from "@/config";
import { Pressable, Text, View } from "react-native";
import { SearchBar, Select } from "@/shared/components";
export function DirectorioFiltros({
  search,
  onSearch,
  torre,
  torres,
  onTorre,
  subTab,
  onSubTab,
}: {
  search: string;
  onSearch: (value: string) => void;
  torre: string;
  torres: string[];
  onTorre: (value: string) => void;
  subTab: "departamentos" | "estacionamientos" | "depositos";
  onSubTab: (value: "departamentos" | "estacionamientos" | "depositos") => void;
}) {
  return (
    <>
      <SearchBar
        value={search}
        onChange={onSearch}
        placeholder="Buscar torre, depto, propietario, estacionamiento, depósito"
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
        {[
          { key: "departamentos", label: "Departamentos" },
          { key: "estacionamientos", label: "Estacionamientos" },
          { key: "depositos", label: "Depósitos" },
        ].map((item) => (
          <Pressable
            key={item.key}
            onPress={() => onSubTab(item.key as typeof subTab)}
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
      <Text className="text-xs text-gray-400 text-center">
        Solo consulta — la edición se hace en Arquitectura
      </Text>
    </>
  );
}
