import { useLayoutEffect, useState } from "react";
import { FlatList, Pressable, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useAuthStore, useUbicacionStore } from "@/stores";
import { InfoButton } from "@/shared/components";
import { HELP } from "@/shared/content/helpContent";
import {
  CorrespondenciaActionOverlays,
  CorrespondenciaCard,
  CorrespondenciaFiltros,
} from "../components";
import {
  useCorrespondencia,
  useCorrespondenciaFiltros,
} from "../hooks/useCorrespondencia";
import type { CorrespondenciaItem } from "@/shared/types";
export function CorrespondenciaScreen() {
  const navigation = useNavigation<any>();
  const rolActivo = useAuthStore((state) => state.rolActivo);
  const ubicaciones = useUbicacionStore((state) => state.ubicaciones);
  const { items, actualizarEstado, eliminar } = useCorrespondencia();
  const filtros = useCorrespondenciaFiltros(items);
  const [menuItem, setMenuItem] = useState<CorrespondenciaItem | null>(null);
  const [deleteItem, setDeleteItem] = useState<CorrespondenciaItem | null>(
    null,
  );
  const [detailItem, setDetailItem] = useState<CorrespondenciaItem | null>(
    null,
  );
  const [entregaPuertaItem, setEntregaPuertaItem] =
    useState<CorrespondenciaItem | null>(null);
  const [entregaPuertaNombre, setEntregaPuertaNombre] = useState("");
  const [entregaPuertaHora, setEntregaPuertaHora] = useState(() =>
    new Date().toLocaleTimeString("es-AR", {
      hour: "2-digit",
      minute: "2-digit",
    }),
  );
  const [showDeleteSuccess, setShowDeleteSuccess] = useState(false);
  const puedeModificarEstado =
    rolActivo === "administrador" || rolActivo === "guardia";
  const puedeCrear = puedeModificarEstado;
  const accesoBloqueado =
    rolActivo === "propietario" && ubicaciones.length === 0;
  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View className="flex-row items-center gap-1">
          <InfoButton
            titulo={HELP.correspondencia.info.titulo}
            descripcion={HELP.correspondencia.info.descripcion}
            bullets={HELP.correspondencia.info.bullets}
            ejemplo={HELP.correspondencia.info.ejemplo}
          />
          {puedeCrear && (
            <Pressable
              onPress={() => navigation.navigate("CorrespondenciaAgregar")}
              className="w-9 h-9 rounded-xl bg-primary items-center justify-center"
            >
              <Text className="text-xl font-bold text-white">+</Text>
            </Pressable>
          )}
        </View>
      ),
    });
  }, [navigation, puedeCrear]);
  const handleEstado = (estado: CorrespondenciaItem["estado"]) => {
    if (!menuItem) return;
    if (estado === "Entregado" && menuItem.entregaEnPuerta) {
      setEntregaPuertaItem(menuItem);
      setEntregaPuertaNombre("");
      setEntregaPuertaHora(
        new Date().toLocaleTimeString("es-AR", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      );
      setMenuItem(null);
      return;
    }
    actualizarEstado({ id: menuItem.id, estado });
    setMenuItem(null);
  };
  const confirmarEntrega = () => {
    if (!entregaPuertaItem) return;
    actualizarEstado({
      id: entregaPuertaItem.id,
      estado: "Entregado",
      extras: {
        fechaEntregado: new Date().toLocaleDateString("es-AR"),
        horaEntregado: entregaPuertaHora,
        entregadoA: entregaPuertaNombre,
      },
    });
    setEntregaPuertaItem(null);
  };
  const confirmarEliminacion = () => {
    if (!deleteItem) return;
    eliminar(deleteItem.id, {
      onSuccess: () => {
        setDeleteItem(null);
        setShowDeleteSuccess(true);
        setTimeout(() => setShowDeleteSuccess(false), 2000);
      },
    });
  };
  if (accesoBloqueado)
    return (
      <View className="flex-1 bg-bg-app items-center justify-center px-4">
        <Text style={{ fontSize: 48, marginBottom: 16 }}>🚫</Text>
        <Text className="text-base text-gray-500 text-center">
          No tienes acceso a Correspondencia. Solo los Residentes pueden usar
          esta función.
        </Text>
      </View>
    );
  return (
    <View className="flex-1 bg-bg-app">
      <FlatList
        data={filtros.filtered}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={{ padding: 12, gap: 10 }}
        ListHeaderComponent={
          <CorrespondenciaFiltros
            search={filtros.search}
            onSearchChange={filtros.setSearch}
            estadoSeleccionados={filtros.estadoSeleccionados}
            onToggleEstado={filtros.toggleEstado}
            onToggleTodos={filtros.toggleTodos}
            todosActivo={filtros.todosActivo}
            filterOpen={filtros.filterOpen}
            onToggleFilterOpen={() =>
              filtros.setFilterOpen(!filtros.filterOpen)
            }
            fechaDesde={filtros.fechaDesde}
            onFechaDesdeChange={filtros.setFechaDesde}
            fechaHasta={filtros.fechaHasta}
            onFechaHastaChange={filtros.setFechaHasta}
            catFilter={filtros.catFilter}
            onCatFilterChange={filtros.setCatFilter}
            entregaFilter={filtros.entregaFilter}
            onEntregaFilterChange={filtros.setEntregaFilter}
          />
        }
        renderItem={({ item }) => (
          <CorrespondenciaCard
            item={item}
            puedeModificarEstado={puedeModificarEstado}
            onPress={() => setDetailItem(item)}
            onMenuPress={() => setMenuItem(item)}
          />
        )}
        ListFooterComponent={<View style={{ height: 80 }} />}
      />
      <CorrespondenciaActionOverlays
        menuItem={menuItem}
        onCloseMenu={() => setMenuItem(null)}
        puedeModificarEstado={puedeModificarEstado}
        puedeCrear={puedeCrear}
        onEstado={handleEstado}
        onEliminarSeleccion={() => {
          setDeleteItem(menuItem);
          setMenuItem(null);
        }}
        onInformar={(item) => {
          setMenuItem(null);
          navigation.navigate("CorrespondenciaAgregar", { informar: item });
        }}
        deleteItem={deleteItem}
        onCloseDelete={() => setDeleteItem(null)}
        onConfirmDelete={confirmarEliminacion}
        entregaPuertaItem={entregaPuertaItem}
        onCloseEntrega={() => setEntregaPuertaItem(null)}
        entregaPuertaNombre={entregaPuertaNombre}
        onNombreChange={setEntregaPuertaNombre}
        entregaPuertaHora={entregaPuertaHora}
        onHoraChange={setEntregaPuertaHora}
        onConfirmEntrega={confirmarEntrega}
        detailItem={detailItem}
        onCloseDetail={() => setDetailItem(null)}
        showDeleteSuccess={showDeleteSuccess}
        onCloseDeleteSuccess={() => setShowDeleteSuccess(false)}
      />
    </View>
  );
}
