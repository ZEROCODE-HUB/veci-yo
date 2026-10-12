import { useLayoutEffect, useState } from "react";
import { FlatList, Pressable, Text, View } from "react-native";
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
import { useNavegacion } from "@/shared/hooks";
import type { AccionDeCorrespondencia } from "../helpers/lista";

export function CorrespondenciaScreen() {
  const navigation = useNavegacion();
  const rolActivo = useAuthStore((state) => state.rolActivo);
  const ubicaciones = useUbicacionStore((state) => state.ubicaciones);
  const { items, cargando, error, actualizarEstado, eliminar } =
    useCorrespondencia();
  const filtros = useCorrespondenciaFiltros(items);
  const [menuItem, setMenuItem] = useState<CorrespondenciaItem | null>(null);
  const [deleteItem, setDeleteItem] = useState<CorrespondenciaItem | null>(
    null,
  );
  const [detailItem, setDetailItem] = useState<CorrespondenciaItem | null>(
    null,
  );
  const [entregaItem, setEntregaItem] = useState<CorrespondenciaItem | null>(
    null,
  );
  const [entregaNombre, setEntregaNombre] = useState("");
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
              accessibilityLabel="Agregar correspondencia"
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

  const handleAccion = (accion: AccionDeCorrespondencia) => {
    const item = menuItem;
    setMenuItem(null);
    if (!item) return;

    if (accion === "entregar") {
      /*
        Se pregunta quien recibe SIEMPRE, no solo en la entrega a puerta.

        Antes, si el vecino bajaba a recogerlo al mostrador, `entregada_a`
        quedaba en nulo. El comentario de la migracion de esa columna dice para
        que esta: «sin esto, "yo nunca recibi ese paquete" no tiene respuesta», y
        el mostrador es justo donde nace esa discusion (R-14, decidido por el
        cliente el 25/09/2026).
      */
      setEntregaItem(item);
      setEntregaNombre("");
      return;
    }
    if (accion === "recibir" || accion === "devolver") {
      actualizarEstado(item.uuid ?? "", "En Portería");
      return;
    }
    if (accion === "informar") {
      navigation.navigate("CorrespondenciaAgregar", { informar: item });
      return;
    }
    setDeleteItem(item);
  };

  const confirmarEntrega = () => {
    if (!entregaItem || entregaNombre.trim() === "") return;
    // La base registra la fecha y la hora de entrega por su cuenta; aqui solo
    // viaja quien recibio el paquete.
    actualizarEstado(entregaItem.uuid ?? "", "Entregado", {
      entregadoA: entregaNombre.trim(),
    });
    setEntregaItem(null);
  };
  const confirmarEliminacion = () => {
    if (!deleteItem) return;
    // «Eliminada con éxito» salía en cuanto se pulsaba, sin saber si lo estaba.
    eliminar(deleteItem.uuid ?? "", {
      onSuccess: () => {
        setShowDeleteSuccess(true);
        setTimeout(() => setShowDeleteSuccess(false), 2000);
      },
    });
    setDeleteItem(null);
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
      {/*
        La lista se pintaba con `data ?? []` y nadie miraba `query.error`. La
        consulta devolvia 400 —pedia el nombre de quien registro el paquete por
        una clave foranea que apunta a `auth.users`, no a `perfil`— y la
        pantalla mostraba una bandeja vacia, identica a la de un edificio sin
        correspondencia. Por eso el modulo llevaba roto desde el principio sin
        que se notara.
      */}
      <FlatList
        data={filtros.filtered}
        // El uuid, no el numero derivado de el: dos envios podian coincidir.
        keyExtractor={(item) => item.uuid ?? item.id.toString()}
        ListEmptyComponent={
          cargando ? null : error ? (
            <View className="items-center p-6 gap-2">
              <Text className="text-base font-semibold text-gray-900">
                No se pudo cargar la correspondencia
              </Text>
              <Text className="text-sm text-center text-gray-500">
                Vuelve a intentarlo. Si sigue pasando, avisa a la
                administración.
              </Text>
            </View>
          ) : (
            <View className="items-center p-6">
              {/*
                No es lo mismo que no haya nada a que lo tape un filtro: decia
                «No hay correspondencia registrada» en los dos casos.
              */}
              <Text className="text-sm text-center text-gray-500">
                {items.length > 0
                  ? "Ningún envío coincide con la búsqueda o los filtros."
                  : "No hay correspondencia registrada."}
              </Text>
            </View>
          )
        }
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
            ocultosActivos={filtros.ocultosActivos}
            onQuitarFiltros={filtros.quitarFiltros}
            cuantos={filtros.filtered.length}
            deCuantos={items.length}
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
        onAccion={handleAccion}
        deleteItem={deleteItem}
        onCloseDelete={() => setDeleteItem(null)}
        onConfirmDelete={confirmarEliminacion}
        entregaItem={entregaItem}
        onCloseEntrega={() => setEntregaItem(null)}
        entregaNombre={entregaNombre}
        onNombreChange={setEntregaNombre}
        onConfirmEntrega={confirmarEntrega}
        detailItem={detailItem}
        onCloseDetail={() => setDetailItem(null)}
        showDeleteSuccess={showDeleteSuccess}
        onCloseDeleteSuccess={() => setShowDeleteSuccess(false)}
      />
    </View>
  );
}
