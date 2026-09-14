import React, { useLayoutEffect, useState } from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useAuthStore } from "@/stores";
import { SearchBar, StatusTabs, Select } from "@/shared/components";
import { CATEGORIAS_PQRS, estadosReclamo } from "../soporteMockData";
import type { PerfilStackParamList } from "@/shared/types";
import { useReclamos } from "../hooks/useReclamos";
import { ReclamoTarjeta } from "../components/reclamos";

type Nav = NativeStackNavigationProp<PerfilStackParamList>;

const TABS = ["Todos", ...estadosReclamo];

export function ReclamosScreen() {
  const navigation = useNavigation<Nav>();
  const { rolActivo } = useAuthStore();
  const { reclamos } = useReclamos();
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("Todos");
  const [filterOpen, setFilterOpen] = useState(false);
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [categoriaFilter, setCategoriaFilter] = useState("");
  const [subcategoriaFilter, setSubcategoriaFilter] = useState("");

  const esAdmin = rolActivo === "administrador";

  const categoriaSel = CATEGORIAS_PQRS.find((c) => c.id === categoriaFilter);
  const subcategoriasDisponibles = categoriaSel?.subcategorias || [];
  const tieneSubcategorias = subcategoriasDisponibles.length > 0;

  useLayoutEffect(() => {
    if (!esAdmin) {
      navigation.setOptions({
        headerRight: () => (
          <Pressable
            onPress={() => navigation.navigate("ReclamoNuevo")}
            className="items-center justify-center mr-1 rounded-md"
            style={{ width: 36, height: 36, backgroundColor: "#F59E0B" }}
          >
            <Text style={{ fontSize: 20, color: "#fff" }}>✉️</Text>
          </Pressable>
        ),
      });
    }
  }, [navigation, esAdmin]);

  const filtered = reclamos.filter((r) => {
    const matchSearch =
      !search ||
      r.titulo.toLowerCase().includes(search.toLowerCase()) ||
      r.nombre.toLowerCase().includes(search.toLowerCase()) ||
      r.numero.includes(search);
    const matchTab = activeTab === "Todos" || r.estado === activeTab;
    const matchCategoria = !categoriaFilter || r.categoria === categoriaFilter;
    const matchSubcategoria =
      !subcategoriaFilter || r.subcategoria === subcategoriaFilter;
    return matchSearch && matchTab && matchCategoria && matchSubcategoria;
  });

  const handleTabChange = (tab: string | null) => {
    const next = tab || "Todos";
    setActiveTab(next);
    if (next === "Todos" || !next) {
      setCategoriaFilter("");
      setSubcategoriaFilter("");
      setFechaDesde("");
      setFechaHasta("");
    }
  };

  return (
    <ScrollView
      className="flex-1 bg-gray-50"
      contentContainerClassName="p-4 gap-2.5"
    >
      {/* Card de búsqueda + filtros */}
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
        <SearchBar value={search} onChange={setSearch} />

        <View className="mt-2.5">
          <StatusTabs
            tabs={TABS}
            active={activeTab}
            onChange={handleTabChange}
            centered
          />
        </View>

        <View className="items-center mt-2">
          <Pressable onPress={() => setFilterOpen((o) => !o)}>
            <Text
              style={{
                fontSize: 16,
                color: "#6B7280",
                transform: [{ rotate: filterOpen ? "180deg" : "0deg" }],
              }}
            >
              ▾
            </Text>
          </Pressable>
        </View>

        {filterOpen && (
          <View className="gap-2.5 mt-2">
            {/* Fechas */}
            <View className="flex-row gap-2">
              <View className="flex-1">
                <Text className="text-sm text-gray-500 mb-1">Fecha desde</Text>
                <View
                  className="rounded-lg px-3 py-2.5"
                  style={{
                    backgroundColor: "#fff",
                    borderWidth: 1,
                    borderColor: "#E5E7EB",
                  }}
                >
                  <Text className="text-sm text-gray-700">
                    {fechaDesde || "dd/mm/aaaa"}
                  </Text>
                </View>
              </View>
              <View className="flex-1">
                <Text className="text-sm text-gray-500 mb-1">Fecha hasta</Text>
                <View
                  className="rounded-lg px-3 py-2.5"
                  style={{
                    backgroundColor: "#fff",
                    borderWidth: 1,
                    borderColor: "#E5E7EB",
                  }}
                >
                  <Text className="text-sm text-gray-700">
                    {fechaHasta || "dd/mm/aaaa"}
                  </Text>
                </View>
              </View>
            </View>

            {/* Categoría + Subcategoría */}
            <View className="flex-row gap-2">
              <View className="flex-1">
                <Select
                  label="Categoría"
                  value={categoriaFilter || "Todas"}
                  options={["Todas", ...CATEGORIAS_PQRS.map((c) => c.id)]}
                  onChange={(v) => {
                    setCategoriaFilter(String(v) === "Todas" ? "" : String(v));
                    setSubcategoriaFilter("");
                  }}
                />
              </View>
              {tieneSubcategorias ? (
                <View className="flex-1">
                  <Select
                    label="Subcategoría"
                    value={subcategoriaFilter || "Todas"}
                    options={["Todas", ...subcategoriasDisponibles]}
                    onChange={(v) =>
                      setSubcategoriaFilter(
                        String(v) === "Todas" ? "" : String(v),
                      )
                    }
                  />
                </View>
              ) : (
                categoriaFilter && (
                  <View className="flex-1 items-center justify-center">
                    <Text className="text-sm text-gray-400">
                      Sin subcategorías
                    </Text>
                  </View>
                )
              )}
            </View>
          </View>
        )}
      </View>

      {/* Lista de reclamos */}
      {filtered.map((item) => (
        <ReclamoTarjeta
          key={item.id}
          reclamo={item}
          onPress={() =>
            navigation.navigate("ReclamoDetalle", { id: String(item.id) })
          }
        />
      ))}
    </ScrollView>
  );
}
