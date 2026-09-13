import { useState } from "react";
import { View, ScrollView } from "react-native";
import { SearchBar, Tabs } from "@/shared/components";
import { faqItems, CATEGORIAS, CATEGORIA_COLORS } from "../soporteMockData";
import { PreguntaFrecuenteItem } from "../components/soporte";

export function PreguntasFrecuentesScreen() {
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const filtered = faqItems.filter(
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
      <Tabs
        tabs={CATEGORIAS}
        active={catFilter}
        onChange={(cat) => setCatFilter(cat || "")}
        variant="status"
        statusColors={CATEGORIA_COLORS}
        centered
      />
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
    </ScrollView>
  );
}
