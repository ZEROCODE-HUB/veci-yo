import { useState } from "react";
import { View, Text, ScrollView } from "react-native";
import { SearchBar, Tabs } from "@/shared/components";
import { PreguntaFrecuenteItem } from "../components/soporte";
import { usePreguntasFrecuentes } from "../hooks/useSoporte";

export function PreguntasFrecuentesScreen() {
  const { preguntas, cargando, categorias } = usePreguntasFrecuentes();
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = preguntas.filter(
    (item) =>
      (!search || item.pregunta.toLowerCase().includes(search.toLowerCase())) &&
      (!catFilter || item.categoria === catFilter),
  );

  return (
    <ScrollView
      className="flex-1 bg-gray-50"
      contentContainerClassName="p-4 gap-4"
    >
      <SearchBar value={search} onChange={setSearch} />

      {categorias.length > 0 && (
        <Tabs
          tabs={categorias}
          active={catFilter}
          onChange={(cat) => setCatFilter(cat || "")}
          variant="status"
          centered
        />
      )}

      <View className="gap-2.5">
        {filtered.map((item) => (
          <PreguntaFrecuenteItem
            key={item.id}
            item={item}
            open={expandedId === item.id}
            onPress={() =>
              setExpandedId(expandedId === item.id ? null : item.id)
            }
          />
        ))}
      </View>

      {!cargando && filtered.length === 0 && (
        <Text className="text-center text-gray-400 py-8">
          No hay preguntas frecuentes todavía.
        </Text>
      )}
    </ScrollView>
  );
}
