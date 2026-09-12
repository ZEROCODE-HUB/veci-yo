import React, { useState, useMemo } from "react";
import { Linking, View, Text, Pressable, FlatList, Image } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import {
  useAuthStore,
  useUbicacionStore,
  useAdminStore,
  useSuscripcionStore,
} from "@/stores";
import {
  Modal,
  BottomSheet,
  BottomSheetOption,
  Button,
  Tabs,
  VerificacionesConsumo,
} from "@/shared/components";
import {
  VisitaCard,
  ReservaHuespedCard,
  VisitaFilters,
  VisitaDetailModal,
  VisitaDeleteModal,
  VisitaGuardiaDetail,
  ReservaGuardiaDetail,
  ReservaAdministradorDetail,
  ReservaPropietarioDetail,
} from "@/features/visitas/components";
import { TIPOS_VISITA, TIPO_LABELS, FILTROS_ESTADO_VISITA } from "@/data";
import type { VisitaItem } from "@/shared/types";
import { TIPO_VISITA_ASSETS } from "@/features/visitas/components/tipoVisitaAssets";
import { useVisitasHistorial } from "@/features/visitas/hooks";
import { useVisitas } from "@/features/visitas/hooks";
import { toComparableDate } from "@/features/visitas/utils";
import { navigateToRoute } from "@/navigation/helpers/navigation.helpers";

const VERIFICACIONES_HUESPEDES = {
  incluidas: 20,
  suscritasUsadas: 5,
  suplementarias: 10,
  vencimientoSuplementarias: "27/10/2026",
};

export function VisitasHistorialScreen() {
  const navigation = useNavigation<any>();
  const {
    items,
    actualizarHoraIngreso,
    actualizarHoraSalida,
    actualizarVisita,
    eliminar,
    setLlegoInvitado,
    toggleInstruccionCumplida,
    marcarDocumentoVerificado,
  } = useVisitas();
  const rolActivo = useAuthStore((s) => s.rolActivo);
  const ubicaciones = useUbicacionStore((s) => s.ubicaciones);
  const ubicacionActiva =
    ubicaciones.find((ubicacion) => ubicacion.favorito) || ubicaciones[0];
  const suscripcionActiva = useSuscripcionStore(
    (s) => !!ubicacionActiva && !!s.suscripciones[ubicacionActiva.id]?.activa,
  );
  const estacionamientos = useAdminStore((s) => s.estacionamientosVisitantes);
  const estacionamientosAsignados = useAdminStore(
    (s) => s.estacionamientosAsignados,
  );
  const asignarEstacionamiento = useAdminStore(
    (s) => s.asignarEstacionamientoVisita,
  );

  const {
    search,
    setSearch,
    activeTab,
    setActiveTab,
    tipoTab,
    setTipoTab,
    vistaSub,
    setVistaSub,
    filterOpen,
    setFilterOpen,
    fechaDesde,
    setFechaDesde,
    fechaHasta,
    setFechaHasta,
    tipoFilter,
    setTipoFilter,
    torreFilter,
    setTorreFilter,
    deptoFilter,
    setDeptoFilter,
    filteredItems,
    hasActiveFilters,
    clearFilters,
  } = useVisitasHistorial(items);
  const [menuItem, setMenuItem] = useState<VisitaItem | null>(null);
  const [detailItem, setDetailItem] = useState<VisitaItem | null>(null);
  const [detailPersonIdx, setDetailPersonIdx] = useState<number | null>(null);
  const [deleteItem, setDeleteItem] = useState<VisitaItem | null>(null);
  const [visitaListaDetalle, setVisitaListaDetalle] =
    useState<VisitaItem | null>(null);
  const [reservaDetalle, setReservaDetalle] = useState<VisitaItem | null>(null);
  const [showSuscripcionModal, setShowSuscripcionModal] = useState(false);
  const [parkingItem, setParkingItem] = useState<VisitaItem | null>(null);
  const [parkingSpot, setParkingSpot] = useState("");
  const currentDetailItem = detailItem
    ? items.find((item) => item.id === detailItem.id) || detailItem
    : null;
  const currentReservaDetalle = reservaDetalle
    ? items.find((item) => item.id === reservaDetalle.id) || reservaDetalle
    : null;

  const parkingModal = (
    <Modal
      visible={!!parkingItem}
      onClose={() => setParkingItem(null)}
      title="Asignar estacionamiento"
    >
      {parkingItem && (
        <View className="gap-3">
          <Text className="text-sm text-gray-500 text-center">
            Asigne un cupo disponible al visitante
          </Text>
          <Text className="text-sm text-gray-900">
            Visitante: <Text className="font-bold">{parkingItem.nombre}</Text>
          </Text>
          <View className="gap-2">
            {Array.from(
              { length: estacionamientos.total || 20 },
              (_, index) => {
                const spot = `B${String(index + 1).padStart(2, "0")}`;
                const occupied = estacionamientosAsignados[spot];
                const selected = parkingSpot === spot;
                return (
                  <Pressable
                    key={spot}
                    disabled={!!occupied}
                    onPress={() => setParkingSpot(spot)}
                    className="flex-row items-center justify-between rounded-xl px-3.5 py-3"
                    style={{
                      borderWidth: 2,
                      borderColor: selected ? "#2563EB" : "#E5E7EB",
                      backgroundColor: selected
                        ? "#EFF6FF"
                        : occupied
                          ? "#F3F4F6"
                          : "#FFFFFF",
                      opacity: occupied ? 0.65 : 1,
                    }}
                  >
                    <Text className="text-sm font-bold text-gray-900">
                      {spot}
                    </Text>
                    <Text className="text-xs text-gray-500">
                      {selected
                        ? "Seleccionado"
                        : occupied
                          ? "Ocupado"
                          : "Disponible"}
                    </Text>
                  </Pressable>
                );
              },
            )}
          </View>
          <Button
            disabled={!parkingSpot}
            onPress={() => {
              if (parkingItem && parkingSpot) {
                asignarEstacionamiento(parkingSpot, `${parkingItem.id}--1`);
                setParkingItem(null);
                setParkingSpot("");
              }
            }}
          >
            Confirmar asignación
          </Button>
        </View>
      )}
    </Modal>
  );

  const esAdmin = rolActivo === "administrador";
  const esGuardia = rolActivo === "guardia";
  const esPropietario = rolActivo === "propietario";
  const esInquilinoLider = rolActivo === "inquilino-lider";
  const esHuesped = rolActivo === "huesped-temporal";
  const puedeCrear =
    esPropietario || esInquilinoLider || esGuardia || esAdmin || esHuesped;
  const puedeEliminar =
    esPropietario || esInquilinoLider || esGuardia || esAdmin;
  const accesoBloqueado = esPropietario && ubicaciones.length === 0;
  const sinCalendario = esGuardia || esAdmin;
  const puedeFiltrarTorrePiso = esGuardia || esAdmin || esHuesped;
  const huespedDisponible =
    suscripcionActiva ||
    esGuardia ||
    esAdmin ||
    esHuesped ||
    (!esPropietario && !esInquilinoLider);

  const tiposDisponibles = useMemo(() => {
    if (esGuardia || esHuesped || esAdmin) return ["amigos", "temporal"];
    return ["amigos", "temporal", "permanente", "huesped-temporal"];
  }, [esGuardia, esHuesped, esAdmin]);

  const TIPO_TABS = useMemo(() => {
    const tabs = [{ value: "visitas", label: "Visitas" }];
    tabs.push({ value: "huespedes", label: "Huéspedes" });
    return esHuesped || !huespedDisponible
      ? tabs.filter((tab) => tab.value === "visitas")
      : tabs;
  }, [esHuesped, huespedDisponible]);

  if (accesoBloqueado) {
    return (
      <View className="flex-1 items-center justify-center gap-4 px-6">
        <Text className="text-4xl mb-2">🚫</Text>
        <Text className="text-base text-gray-500 text-center">
          No tienes acceso a Visitas. Solo los Residentes pueden usar esta
          función.
        </Text>
        <Text className="text-sm text-gray-400 text-center">
          Si eres Propietario, declárate como Residente desde Configuración.
        </Text>
      </View>
    );
  }

  if (visitaListaDetalle) {
    return (
      <VisitasPersonasScreen
        item={visitaListaDetalle}
        onBack={() => setVisitaListaDetalle(null)}
        onSelectPerson={(personIndex) => {
          const item = visitaListaDetalle;
          setVisitaListaDetalle(null);
          setDetailPersonIdx(personIndex);
          setDetailItem(item);
        }}
      />
    );
  }

  if (currentReservaDetalle) {
    if (esGuardia) {
      return (
        <ReservaGuardiaDetail
          item={currentReservaDetalle}
          onBack={() => setReservaDetalle(null)}
          parkingModal={parkingModal}
          onAssignParking={() => {
            setParkingSpot("");
            setParkingItem(currentReservaDetalle);
          }}
          onToggleArrival={(guestIndex, arrived) =>
            setLlegoInvitado(currentReservaDetalle.id, guestIndex, arrived)
          }
          onUpdateArrivalTime={(guestIndex, time) =>
            actualizarHoraIngreso(currentReservaDetalle.id, guestIndex, time)
          }
          onUpdateDepartureTime={(guestIndex, time) =>
            actualizarHoraSalida(currentReservaDetalle.id, guestIndex, time)
          }
        />
      );
    }
    if (esPropietario || esInquilinoLider) {
      return (
        <ReservaPropietarioDetail
          item={currentReservaDetalle}
          onBack={() => setReservaDetalle(null)}
          onUpdateInvitado={(index, patch) => {
            const invitados = currentReservaDetalle.invitados.map((invitado, invitadoIndex) =>
              invitadoIndex === index ? { ...invitado, ...patch } : invitado,
            );
            actualizarVisita(currentReservaDetalle.id, { invitados });
          }}
        />
      );
    }
    return (
      <ReservaAdministradorDetail
        item={currentReservaDetalle}
        onBack={() => setReservaDetalle(null)}
      />
    );
  }

  return (
    <View className="flex-1 bg-white">
      <FlatList
        data={vistaSub === "lista" ? filteredItems : []}
        keyExtractor={(item) => String(item.id)}
        contentContainerClassName="px-4 pb-5"
        contentContainerStyle={{ paddingTop: 12, gap: 10 }}
        ListHeaderComponent={
          <View className="gap-2.5">
            {/* Subscription banner */}
            {!huespedDisponible && (
              <View
                className="flex-row items-center gap-2.5 p-3 rounded-xl"
                style={{
                  backgroundColor: "#F3F4F6",
                  borderWidth: 1,
                  borderColor: "#E5E7EB",
                }}
              >
                <Text style={{ fontSize: 20 }}>🔒</Text>
                <View className="flex-1">
                  <Text className="text-sm font-bold text-gray-500">
                    Huésped Temporal — Requiere suscripción
                  </Text>
                  <Text className="text-xs text-gray-400">
                    Puedes activarlo desde Configuración {">"} Huéspedes
                    Temporales o tocando el card Huésped Temporal.
                  </Text>
                </View>
              </View>
            )}

            {/* Quick-access registration buttons */}
            {puedeCrear && (
              <View className="flex-row flex-wrap gap-2">
                {tiposDisponibles.map((tipo) => (
                  <Pressable
                    key={tipo}
                    onPress={() => {
                      const esHuespedTemporal = tipo === "huesped-temporal";
                      if (esHuespedTemporal && !huespedDisponible) {
                        setShowSuscripcionModal(true);
                        return;
                      }
                      navigation.navigate("VisitasNuevo", {
                        tipoPreseleccionado: tipo,
                      });
                    }}
                    className="flex-row items-center gap-2 flex-1"
                    style={{
                      minWidth: "48%",
                      paddingVertical: 10,
                      paddingHorizontal: 12,
                      borderRadius: 16,
                      borderWidth: 1,
                      borderColor: "#E5E7EB",
                      backgroundColor: "#FFFFFF",
                      shadowColor: "#000",
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.08,
                      shadowRadius: 8,
                      elevation: 3,
                      opacity:
                        tipo === "huesped-temporal" && !huespedDisponible
                          ? 0.6
                          : 1,
                    }}
                  >
                    <View
                      className="w-8 h-8 rounded-full items-center justify-center"
                      style={{ backgroundColor: "#F3F4F6" }}
                    >
                      <Image
                        source={
                          TIPO_VISITA_ASSETS[tipo] || TIPO_VISITA_ASSETS.amigos
                        }
                        style={{ width: 32, height: 32, borderRadius: 9999 }}
                        resizeMode="cover"
                      />
                    </View>
                    <Text
                      className="text-xs font-medium text-gray-900 flex-1"
                      numberOfLines={2}
                    >
                      {TIPO_LABELS[tipo] || tipo}
                      {tipo === "huesped-temporal" && !huespedDisponible
                        ? " 🔒"
                        : ""}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}

            {/* Type tabs: Visitas / Huéspedes */}
            <Tabs
              tabs={TIPO_TABS}
              active={tipoTab}
              onChange={(v) => setTipoTab(v || "visitas")}
              centered
            />

            {/* List/Calendar toggle */}
            {!sinCalendario && (
              <View
                className="flex-row self-center rounded-full p-0.5"
                style={{ backgroundColor: "#F9FAFB", gap: 2 }}
              >
                {[
                  {
                    value: "lista" as const,
                    label: "Lista",
                    icon: "list" as const,
                  },
                  {
                    value: "calendario" as const,
                    label: "Calendario",
                    icon: "calendar" as const,
                  },
                ].map((op) => {
                  const active = vistaSub === op.value;
                  return (
                    <Pressable
                      key={op.value}
                      onPress={() => setVistaSub(op.value)}
                      className="flex-row items-center gap-1.5 rounded-full px-4 py-1.5"
                      style={{
                        backgroundColor: active ? "#FFFFFF" : "transparent",
                        boxShadow: active
                          ? "0 1px 3px rgba(0,0,0,0.1)"
                          : "none",
                      }}
                    >
                      <Ionicons
                        name={op.icon}
                        size={14}
                        color={active ? "#111827" : "#6B7280"}
                      />
                      <Text
                        className="text-xs"
                        style={{
                          color: active ? "#111827" : "#6B7280",
                          fontWeight: active ? "700" : "500",
                        }}
                      >
                        {op.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            )}

            {/* Filters */}
            {vistaSub === "lista" && (
              <VisitaFilters
                search={search}
                onSearchChange={setSearch}
                activeTab={activeTab}
                onTabChange={setActiveTab}
                showStatusTabs={tipoTab === "huespedes"}
                filterOpen={filterOpen}
                onToggleFilterOpen={() => setFilterOpen(!filterOpen)}
                fechaDesde={fechaDesde}
                onFechaDesdeChange={setFechaDesde}
                fechaHasta={fechaHasta}
                onFechaHastaChange={setFechaHasta}
                tipoFilter={tipoFilter}
                onTipoFilterChange={setTipoFilter}
                torreFilter={torreFilter}
                onTorreFilterChange={setTorreFilter}
                deptoFilter={deptoFilter}
                onDeptoFilterChange={setDeptoFilter}
                canFilterTower={puedeFiltrarTorrePiso}
                showCategoriaFilter={tipoTab !== "huespedes"}
                algumFiltroAtivo={hasActiveFilters}
                onLimpiarFiltros={clearFilters}
              />
            )}

            {/* Consumo de verificaciones del paquete de Huéspedes */}
            {tipoTab === "huespedes" && !esGuardia && (
              <VerificacionesConsumo
                verificaciones={VERIFICACIONES_HUESPEDES}
                suscripcionActiva={suscripcionActiva}
              />
            )}
          </View>
        }
        ListFooterComponent={
          vistaSub === "lista" ? (
            <View className="items-center mt-2">
              <Text className="text-xs text-gray-400">
                Mostrando {filteredItems.length} de {items.length} visitas
              </Text>
            </View>
          ) : null
        }
        ListEmptyComponent={
          vistaSub === "calendario" ? (
            <CalendarioVisitas
              items={filteredItems}
              onSelect={(item) => setDetailItem(item)}
            />
          ) : (
            <View className="items-center justify-center py-20">
              <Text className="text-5xl mb-4">📭</Text>
              <Text className="text-lg font-bold text-gray-900 mb-1">
                No hay visitas
              </Text>
              <Text className="text-sm text-gray-500 text-center">
                {search
                  ? "No se encontraron visitas con esos filtros"
                  : "Todavía no tienes visitas registradas"}
              </Text>
            </View>
          )
        }
        renderItem={({ item }) =>
          tipoTab === "huespedes" ? (
            <ReservaHuespedCard
              item={item}
              showParkingAction={esAdmin}
              isGuardia={esGuardia}
              showMenu={!esGuardia}
              showDepartment={esAdmin || esGuardia}
              assignedParking={
                Object.entries(estacionamientosAsignados)
                  .filter(([, value]) =>
                    String(value).startsWith(`${item.id}-`),
                  )
                  .map(([spot]) => spot)
                  .join(", ") || undefined
              }
              onParkingPress={() => {
                setParkingSpot("");
                setParkingItem(item);
              }}
              onPress={() => setReservaDetalle(item)}
              onMenuPress={() => setMenuItem(item)}
            />
          ) : (
            <VisitaCard
              item={item}
              showParkingAction={esGuardia || esAdmin}
              onParkingPress={() => {
                setParkingSpot("");
                setParkingItem(item);
              }}
              onPress={() => {
                if (
                  item.tipo !== "huesped-temporal" &&
                  item.invitados &&
                  item.invitados.length > 1
                ) {
                  setVisitaListaDetalle(item);
                } else {
                  setDetailPersonIdx(
                    esGuardia && item.invitados?.length === 1 ? 0 : null,
                  );
                  setDetailItem(item);
                }
              }}
              onMenuPress={() => setMenuItem(item)}
            />
          )
        }
      />

      {/* Detail modal */}
      <Modal
        visible={!!detailItem}
        onClose={() => {
          setDetailItem(null);
          setDetailPersonIdx(null);
        }}
        title={
          detailPersonIdx !== null &&
          currentDetailItem?.invitados?.[detailPersonIdx]
            ? `Huésped: ${currentDetailItem.invitados[detailPersonIdx].nombre}`
            : currentDetailItem?.tipo === "huesped-temporal"
              ? `Reserva: ${currentDetailItem.reserva || ""}`
              : esGuardia
                ? currentDetailItem?.nombre || ""
                : `Visita: ${currentDetailItem?.fechaDesde || ""}`
        }
      >
        {currentDetailItem &&
          (esGuardia ? (
            <VisitaGuardiaDetail
              item={currentDetailItem}
              personIndex={detailPersonIdx}
              onToggleArrival={(arrived) =>
                setLlegoInvitado(
                  currentDetailItem.id,
                  detailPersonIdx ?? -1,
                  arrived,
                )
              }
              onToggleInstruction={() =>
                toggleInstruccionCumplida(currentDetailItem.id, "llamoAnuncie")
              }
              onVerifyDocument={() =>
                marcarDocumentoVerificado(
                  currentDetailItem.id,
                  detailPersonIdx ?? -1,
                )
              }
              onUpdateArrivalTime={(time) =>
                actualizarHoraIngreso(
                  currentDetailItem.id,
                  detailPersonIdx ?? -1,
                  time,
                )
              }
              onUpdateDepartureTime={(time) =>
                actualizarHoraSalida(
                  currentDetailItem.id,
                  detailPersonIdx ?? -1,
                  time,
                )
              }
              onToggleDeparture={(registered) =>
                actualizarHoraSalida(
                  currentDetailItem.id,
                  detailPersonIdx ?? -1,
                  registered
                    ? new Date().toLocaleTimeString("es-AR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "",
                )
              }
              onUpdateEntryNotes={(notes) =>
                actualizarVisita(currentDetailItem.id, {
                  anotacionesIngreso: notes,
                })
              }
              onUpdateExitNotes={(notes) =>
                actualizarVisita(currentDetailItem.id, {
                  anotacionesSalida: notes,
                })
              }
              onAddEntryPhotos={(photos) =>
                actualizarVisita(currentDetailItem.id, {
                  fotosIngreso: [
                    ...(currentDetailItem.fotosIngreso || []),
                    ...photos,
                  ],
                })
              }
              onAddExitPhotos={(photos) =>
                actualizarVisita(currentDetailItem.id, {
                  fotosSalida: [
                    ...(currentDetailItem.fotosSalida || []),
                    ...photos,
                  ],
                })
              }
              onCallAnnounce={() => {
                if (currentDetailItem.telefonoResidente) {
                  Linking.openURL(`tel:${currentDetailItem.telefonoResidente}`);
                }
              }}
              lugaresDisponibles={Math.max(
                0,
                estacionamientos.total - estacionamientos.ocupados,
              )}
              onAssignParking={() => {
                setDetailItem(null);
                setParkingSpot("");
                setParkingItem(currentDetailItem);
              }}
              onRegisterExit={() =>
                actualizarHoraSalida(
                  currentDetailItem.id,
                  detailPersonIdx ?? -1,
                  new Date().toLocaleTimeString("es-AR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  }),
                )
              }
            />
          ) : (
            <VisitaDetailModal
              item={currentDetailItem}
              personIndex={detailPersonIdx}
              showAssignParking={esAdmin}
              onAssignParking={() => {
                setDetailItem(null);
                setDetailPersonIdx(null);
                setParkingSpot("");
                setParkingItem(currentDetailItem);
              }}
              assignedSpots={Object.entries(estacionamientosAsignados)
                .filter(([, key]) =>
                  String(key).startsWith(`${currentDetailItem.id}-`),
                )
                .map(([spot]) => spot)}
            />
          ))}
      </Modal>

      {/* Menu bottom sheet */}
      <BottomSheet visible={!!menuItem} onClose={() => setMenuItem(null)}>
        {menuItem?.tipo === "huesped-temporal" ? (
          <>
            <BottomSheetOption
              label="Editar"
              onPress={() => {
                const m = menuItem;
                setMenuItem(null);
                if (m) setDetailItem(m);
              }}
            />
            {puedeEliminar && (
              <BottomSheetOption
                label="Eliminar"
                onPress={() => {
                  const m = menuItem;
                  setMenuItem(null);
                  if (m) setDeleteItem(m);
                }}
                variant="danger"
              />
            )}
          </>
        ) : (
          <>
            <BottomSheetOption
              label="Denunciar / Reportar"
              variant="primary"
              onPress={() => {
                const m = menuItem;
                setMenuItem(null);
                navigateToRoute(navigation, "ReclamoNuevo", {
                  categoriaPreseleccionada: "Denuncia entre departamentos",
                  tituloPreseleccionado: `Denuncia: ${m?.nombre || ""}`,
                  descripcionPreseleccionada: `Reporte desde visitas contra: ${m?.nombre || ""} (CI: ${m?.ci || ""})`,
                });
              }}
            />
            {puedeEliminar && (
              <BottomSheetOption
                label="Eliminar"
                onPress={() => {
                  const m = menuItem;
                  setMenuItem(null);
                  if (m) setDeleteItem(m);
                }}
                variant="danger"
              />
            )}
          </>
        )}
      </BottomSheet>

      {/* Delete confirmation */}
      <VisitaDeleteModal
        visible={!!deleteItem}
        item={deleteItem}
        onConfirm={() => {
          if (deleteItem) {
            eliminar(deleteItem.id);
            setDeleteItem(null);
          }
        }}
        onCancel={() => setDeleteItem(null)}
      />

      <Modal
        visible={!!parkingItem}
        onClose={() => setParkingItem(null)}
        title="Asignar estacionamiento"
      >
        {parkingItem && (
          <View className="gap-3">
            <Text className="text-sm text-gray-500 text-center">
              Asigne un cupo disponible al visitante
            </Text>
            <Text className="text-sm text-gray-900">
              Visitante: <Text className="font-bold">{parkingItem.nombre}</Text>
            </Text>
            <View className="gap-2">
              {Array.from(
                { length: estacionamientos.total || 20 },
                (_, index) => {
                  const spot = `B${String(index + 1).padStart(2, "0")}`;
                  const occupied = estacionamientosAsignados[spot];
                  const selected = parkingSpot === spot;
                  return (
                    <Pressable
                      key={spot}
                      disabled={!!occupied}
                      onPress={() => setParkingSpot(spot)}
                      className="flex-row items-center justify-between rounded-xl px-3.5 py-3"
                      style={{
                        borderWidth: 2,
                        borderColor: selected ? "#2563EB" : "#E5E7EB",
                        backgroundColor: selected
                          ? "#EFF6FF"
                          : occupied
                            ? "#F3F4F6"
                            : "#FFFFFF",
                        opacity: occupied ? 0.65 : 1,
                      }}
                    >
                      <Text className="text-sm font-bold text-gray-900">
                        {spot}
                      </Text>
                      <Text className="text-xs text-gray-500">
                        {selected
                          ? "Seleccionado"
                          : occupied
                            ? "Ocupado"
                            : "Disponible"}
                      </Text>
                    </Pressable>
                  );
                },
              )}
            </View>
            <Button
              disabled={!parkingSpot}
              onPress={() => {
                if (parkingItem && parkingSpot) {
                  asignarEstacionamiento(parkingSpot, `${parkingItem.id}--1`);
                  setParkingItem(null);
                  setParkingSpot("");
                }
              }}
            >
              Confirmar asignación
            </Button>
          </View>
        )}
      </Modal>

      <Modal
        visible={showSuscripcionModal}
        onClose={() => setShowSuscripcionModal(false)}
        title="VeciYo Huesped Temporal"
      >
        <View className="gap-4 items-center">
          <View
            className="w-full h-40 rounded-2xl items-center justify-center"
            style={{ backgroundColor: "#F3F4F6" }}
          >
            <Text style={{ fontSize: 42 }}>▶️</Text>
          </View>
          <Text className="text-sm text-gray-700 text-center">
            Los primeros 30 dias son gratuitos. Suscribete y disfruta de todos
            los beneficios.
          </Text>
          <Button onPress={() => setShowSuscripcionModal(false)}>
            Entendido
          </Button>
        </View>
      </Modal>
    </View>
  );
}

function personasDeVisitaNormal(item: VisitaItem) {
  const titular = {
    nombre: item.nombre,
    ci: item.ci,
    esTitular: true,
    idx: -1,
    horaIngreso: item.horaIngreso,
    horaSalida: item.horaSalida,
  };

  if (!item.invitados?.length) return [titular];

  return [
    titular,
    ...item.invitados.map((invitado, idx) => ({
      ...invitado,
      esTitular: false,
      idx,
    })),
  ];
}

function VisitasPersonasScreen({
  item,
  onBack,
  onSelectPerson,
}: {
  item: VisitaItem;
  onBack: () => void;
  onSelectPerson: (personIndex: number) => void;
}) {
  const personas = personasDeVisitaNormal(item);
  const tipoIcon = TIPO_VISITA_ASSETS[item.tipo] || TIPO_VISITA_ASSETS.amigos;
  const nombreVisita = item.esEvento ? item.nombreEvento : item.nombre;

  return (
    <View className="flex-1 bg-white">
      <FlatList
        data={personas}
        keyExtractor={(person, index) => `${item.id}-${person.idx}-${index}`}
        contentContainerClassName="px-4 pb-5"
        contentContainerStyle={{ paddingTop: 12, gap: 12 }}
        ListHeaderComponent={
          <View className="gap-2.5">
            <Pressable
              onPress={onBack}
              className="flex-row items-center gap-1.5 self-start py-2"
            >
              <Ionicons name="arrow-back" size={18} color="#F5B800" />
              <Text className="text-sm font-semibold text-primary">
                Volver a visitas
              </Text>
            </Pressable>
            <Text className="text-sm font-semibold text-gray-500">
              {nombreVisita} · {TIPO_LABELS[item.tipo] || item.tipo} ·{" "}
              {item.fechaDesde}
              {item.fechaHasta ? ` a ${item.fechaHasta}` : ""}
            </Text>
          </View>
        }
        renderItem={({ item: person }) => (
          <Pressable
            onPress={() => onSelectPerson(person.idx)}
            className="flex-row items-center justify-between rounded-2xl bg-white p-3.5 active:opacity-80"
            style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}
          >
            <View className="flex-row items-center gap-2.5 flex-1">
              <Image
                source={tipoIcon}
                style={{ width: 40, height: 40, borderRadius: 9999 }}
                resizeMode="cover"
              />
              <View className="flex-1">
                <Text className="text-base font-semibold text-gray-900">
                  {person.nombre}{" "}
                  {person.esTitular ? (
                    <Text className="text-[10px] text-gray-400">(Titular)</Text>
                  ) : null}
                </Text>
                {(person as { ci?: string }).ci ? (
                  <Text className="text-xs text-gray-500">
                    DNI: {(person as { ci?: string }).ci}
                  </Text>
                ) : null}
                {person.horaIngreso ? (
                  <Text className="text-xs text-gray-500">
                    Ingreso: {person.horaIngreso}
                    {person.horaSalida ? ` · Salida: ${person.horaSalida}` : ""}
                  </Text>
                ) : null}
              </View>
            </View>
            <Text className="text-sm text-primary">Ver detalles →</Text>
          </Pressable>
        )}
      />
    </View>
  );
}

function fechaComparable(value?: string): string {
  return toComparableDate(value);
}

function CalendarioVisitas({
  items,
  onSelect,
}: {
  items: VisitaItem[];
  onSelect: (item: VisitaItem) => void;
}) {
  const [month, setMonth] = useState(() => new Date());
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const firstDay = new Date(year, monthIndex, 1).getDay();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const weekDays = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
  const monthLabel = month.toLocaleDateString("es-ES", {
    month: "long",
    year: "numeric",
  });

  return (
    <View
      className="bg-white rounded-2xl overflow-hidden mt-2"
      style={{
        boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
        borderWidth: 1,
        borderColor: "#F3F4F6",
      }}
    >
      <View className="flex-row items-center justify-between px-3.5 py-3">
        <Pressable
          onPress={() => setMonth(new Date(year, monthIndex - 1, 1))}
          className="w-11 h-11 items-center justify-center"
          accessibilityLabel="Mes anterior"
        >
          <Ionicons name="chevron-back" size={22} color="#111827" />
        </Pressable>
        <Text className="text-base font-bold text-gray-900 capitalize">
          {monthLabel}
        </Text>
        <Pressable
          onPress={() => setMonth(new Date(year, monthIndex + 1, 1))}
          className="w-11 h-11 items-center justify-center"
          accessibilityLabel="Mes siguiente"
        >
          <Ionicons name="chevron-forward" size={22} color="#111827" />
        </Pressable>
      </View>
      <View className="flex-row flex-wrap px-2 pb-2">
        {weekDays.map((day) => (
          <Text
            key={day}
            className="text-center text-xs font-semibold text-gray-400 py-1"
            style={{ width: "14.2857%" }}
          >
            {day}
          </Text>
        ))}
        {Array.from({ length: firstDay }).map((_, index) => (
          <View
            key={`empty-${index}`}
            style={{ width: "14.2857%", height: 76 }}
          />
        ))}
        {Array.from({ length: daysInMonth }).map((_, index) => {
          const day = index + 1;
          const date = `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const dayItems = items.filter(
            (item) => fechaComparable(item.fechaDesde) === date,
          );
          return (
            <View
              key={day}
              className="p-1"
              style={{ width: "14.2857%", height: 76 }}
            >
              <Text className="text-xs text-gray-900">{day}</Text>
              {dayItems.slice(0, 2).map((item) => (
                <Pressable
                  key={item.id}
                  onPress={() => onSelect(item)}
                  className="rounded-full px-1.5 mt-1"
                  style={{ backgroundColor: colorEstado(item.estado) }}
                >
                  <Text className="text-[10px] text-white" numberOfLines={1}>
                    {item.nombre}
                  </Text>
                </Pressable>
              ))}
            </View>
          );
        })}
      </View>
    </View>
  );
}

function colorEstado(estado?: string): string {
  if (estado === "Aceptado") return "#F5B800";
  if (estado === "Ingresado") return "#16A34A";
  if (estado === "Rechazado") return "#EF4444";
  return "#9CA3AF";
}
