import { useState } from "react";
import { View, Text, ScrollView } from "react-native";
import { Button, SearchBar, Tabs } from "@/shared/components";
import {
  PreguntaFrecuenteFormModal,
  PreguntaFrecuenteItem,
} from "../components/soporte";
import { usePreguntasFrecuentes } from "../hooks/useSoporte";
import type { PreguntaFrecuente } from "../services";

export function PreguntasFrecuentesScreen() {
  const { preguntas, cargando, categorias, puedeEditar, guardar, eliminar } =
    usePreguntasFrecuentes();
  // `undefined` = cerrado; `null` = una nueva.
  const [editando, setEditando] = useState<PreguntaFrecuente | null | undefined>();
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

      {puedeEditar ? (
        <Button size="sm" variant="secondary" onPress={() => setEditando(null)}>
          + Agregar pregunta
        </Button>
      ) : null}

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
            onEdit={puedeEditar ? () => setEditando(item) : undefined}
          />
        ))}
      </View>

      {!cargando && filtered.length === 0 && (
        <Text className="text-center text-gray-400 py-8">
          No hay preguntas frecuentes todavía.
        </Text>
      )}

      <PreguntaFrecuenteFormModal
        visible={editando !== undefined}
        editando={editando ?? null}
        guardando={guardar.isPending}
        borrando={eliminar.isPending}
        onClose={() => setEditando(undefined)}
        onSave={(form) =>
          guardar.mutate(
            { id: editando?.id, form },
            { onSuccess: () => setEditando(undefined) },
          )
        }
        onDelete={() =>
          editando &&
          eliminar.mutate(editando.id, {
            onSuccess: () => setEditando(undefined),
          })
        }
      />
    </ScrollView>
  );
}
