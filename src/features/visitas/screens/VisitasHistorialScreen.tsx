import { theme } from "@/config";
import React, { useLayoutEffect, useState } from "react";
import { Linking, View, Text, Pressable, FlatList, Image } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import {
  useAuthStore,
  useUbicacionStore,
  useAdminStore,
} from "@/stores";
import {
  Modal,
  BottomSheet,
  BottomSheetOption,
  Button,
  InfoButton,
  SuscripcionPagoModal,
  Tabs,
} from "@/shared/components";
import { VerificacionesConsumo } from "../components";
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
import { TIPOS_VISITA, TIPO_LABELS, FILTROS_ESTADO_VISITA } from "../constants";
import type { VisitaItem } from "@/shared/types";
import { TIPO_VISITA_ASSETS } from "@/features/visitas/components/tipoVisitaAssets";
import { useVisitasHistorial } from "@/features/visitas/hooks";
import { useVisitas } from "@/features/visitas/hooks";
import { useVisitasPermisos } from "@/features/visitas/hooks/useVisitasPermisos";
import { navigateToRoute } from "@/navigation/helpers/navigation.helpers";
import { useHuespedesTemporales } from "@/features/propietario/hooks/useHuespedesTemporales";
import { HELP } from "@/shared/content/helpContent";
import { formatTime } from "@/shared/utils";
import { CalendarioVisitas as CalendarioVisitasComponent } from "../components/historial/CalendarioVisitas";
import { VisitasPersonasView } from "../components/historial/VisitasPersonasView";
import { AsignarEstacionamientoModal } from "../components/historial/AsignarEstacionamientoModal";
import { useEstacionamientosVisita } from "../hooks/useEstacionamientosVisita";
import { useConsumoVerificaciones } from "../hooks/useConsumoVerificaciones";

export function VisitasHistorialScreen() {
  const navigation = useNavigation<any>();
  const consumoVerificaciones = useConsumoVerificaciones();
  const {
    items,
    cargando,
    actualizarVisita,
    eliminarVisita,
    registrarAnuncio,
    marcarLlegadaInvitado,
    registrarHoraInvitado,
    verificarDocumentoInvitado,
    actualizarInvitado,
  } = useVisitas();

  // El uuid del invitado reemplaza a su posicion en el array: borrar o
  // reordenar invitados ya no puede mover los datos de otra persona.
  const uuidInvitado = (visita: { invitados: { uuid?: string }[] }, indice: number) =>
    visita.invitados[indice]?.uuid ?? "";
  
  const rolActivo = useAuthStore((s) => s.rolActivo);
  const modoAuth = useAuthStore((s) => s.modo);
  const ubicaciones = useUbicacionStore((s) => s.ubicaciones);
  const ubicacionActiva =
    ubicaciones.find((ubicacion) => ubicacion.favorito) || ubicaciones[0];
  const {
    // La suscripcion sale de la base, no de un store que se perdia al
    // recargar: es la misma fuente que mira la pantalla de configuracion.
    tieneSuscripcion: suscripcionActiva,
    showPayment,
    setShowPayment,
    precio,
    pagoSimulado,
    irAlPago,
    confirmarPago,

    paymentLoading,
  } = useHuespedesTemporales();
  const estacionamientos = useAdminStore((s) => s.estacionamientosVisitantes);
  // Que cupo ocupa cada visita, desde `asignacion_estacionamiento`.
  const { porVisita: cuposPorVisita } = useEstacionamientosVisita();

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
  const currentDetailItem = detailItem
    ? items.find((item) => item.id === detailItem.id) || detailItem
    : null;
  const currentReservaDetalle = reservaDetalle
    ? items.find((item) => item.id === reservaDetalle.id) || reservaDetalle
    : null;

  // El modal de estacionamiento se renderiza abajo; `ReservaGuardiaDetail`
  // solo necesita saber que se abre.
  const parkingModal = null;

  const {
    esAdmin,
    esGuardia,
    esPropietario,
    esInquilinoLider,
    esHuesped,
    puedeCrear,
    puedeEliminar,
    accesoBloqueado,
    sinCalendario,
    puedeFiltrarTorrePiso,
    huespedDisponible,
    tiposDisponibles,
    tipoTabs,
  } = useVisitasPermisos(rolActivo, ubicaciones.length, suscripcionActiva);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <InfoButton
          titulo={HELP.visitas.info.titulo}
          descripcion={HELP.visitas.info.descripcion}
          bullets={HELP.visitas.info.bullets}
          ejemplo={modoAuth === "incognito" ? undefined : HELP.visitas.info.ejemplo}
        />
      ),
    });
  }, [navigation, esPropietario, modoAuth]);

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
      <VisitasPersonasView
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
            setParkingItem(currentReservaDetalle);
          }}
          onToggleInstruction={() =>
            registrarAnuncio(
              currentReservaDetalle.uuid ?? "",
              !currentReservaDetalle.instruccionesCumplidas?.llamoAnuncie,
            )
          }
          onCallAnnounce={() => {
            if (currentReservaDetalle.telefonoResidente) {
              Linking.openURL(`tel:${currentReservaDetalle.telefonoResidente}`);
            }
          }}
          onUpdateEntryNotes={(notes) =>
            actualizarVisita(currentReservaDetalle.uuid ?? "", {
              anotacionesIngreso: notes,
            })
          }
          onUpdateExitNotes={(notes) =>
            actualizarVisita(currentReservaDetalle.uuid ?? "", {
              anotacionesSalida: notes,
            })
          }
          onAddEntryPhotos={(photos) =>
            actualizarVisita(currentReservaDetalle.uuid ?? "", {
              fotosIngreso: [
                ...(currentReservaDetalle.fotosIngreso || []),
                ...photos,
              ],
            })
          }
          onAddExitPhotos={(photos) =>
            actualizarVisita(currentReservaDetalle.uuid ?? "", {
              fotosSalida: [
                ...(currentReservaDetalle.fotosSalida || []),
                ...photos,
              ],
            })
          }
          onToggleArrival={(guestIndex, arrived) =>
            marcarLlegadaInvitado(
              uuidInvitado(currentReservaDetalle, guestIndex),
              arrived,
            )
          }
          onVerifyDocument={(guestIndex) =>
            verificarDocumentoInvitado(
              uuidInvitado(currentReservaDetalle, guestIndex),
            )
          }
          onUpdateArrivalTime={(guestIndex, time) =>
            registrarHoraInvitado(
              uuidInvitado(currentReservaDetalle, guestIndex),
              "ingreso",
              time,
            )
          }
          onUpdateDepartureTime={(guestIndex, time) =>
            registrarHoraInvitado(
              uuidInvitado(currentReservaDetalle, guestIndex),
              "salida",
              time,
            )
          }
          lugaresDisponibles={Math.max(
            0,
            estacionamientos.total - estacionamientos.ocupados,
          )}
        />
      );
    }
    if (esPropietario || esInquilinoLider) {
      return (
        <ReservaPropietarioDetail
          item={currentReservaDetalle}
          onBack={() => setReservaDetalle(null)}
          onUpdateInvitado={(index, patch) =>
            actualizarInvitado(uuidInvitado(currentReservaDetalle, index), patch)
          }
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
                  backgroundColor: theme.colors.borderLight,
                  borderWidth: 1,
                  borderColor: theme.colors.border,
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
                      borderColor: theme.colors.border,
                      backgroundColor: theme.colors.bgCard,
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
                      style={{ backgroundColor: theme.colors.borderLight }}
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
              tabs={tipoTabs}
              active={tipoTab}
              onChange={(v) => setTipoTab(v || "visitas")}
              centered
            />

            {/* List/Calendar toggle */}
            {!sinCalendario && (
              <View
                className="flex-row self-center rounded-full p-0.5"
                style={{ backgroundColor: theme.colors.bgMuted, gap: 2 }}
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
                        backgroundColor: active ? theme.colors.bgCard : "transparent",
                        boxShadow: active
                          ? "0 1px 3px rgba(0,0,0,0.1)"
                          : "none",
                      }}
                    >
                      <Ionicons
                        name={op.icon}
                        size={14}
                        color={active ? theme.colors.text : theme.colors.textSecondary}
                      />
                      <Text
                        className="text-xs"
                        style={{
                          color: active ? theme.colors.text : theme.colors.textSecondary,
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
                verificaciones={consumoVerificaciones}
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
            <CalendarioVisitasComponent
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
                cuposPorVisita[(item as any).uuid]?.join(", ") || undefined
              }
              onParkingPress={() => {
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
                    setParkingItem(item);
              }}
              onPress={() => {
                if (
                  esGuardia &&
                  item.tipo !== "huesped-temporal" &&
                  item.invitados &&
                  item.invitados.length > 1
                ) {
                  setReservaDetalle(item);
                  return;
                }
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
                marcarLlegadaInvitado(
                  uuidInvitado(currentDetailItem, detailPersonIdx ?? -1),
                  arrived,
                )
              }
              onToggleInstruction={() =>
                registrarAnuncio(
                  currentDetailItem.uuid ?? "",
                  !currentDetailItem.instruccionesCumplidas?.llamoAnuncie,
                )
              }
              onVerifyDocument={() =>
                verificarDocumentoInvitado(
                  uuidInvitado(currentDetailItem, detailPersonIdx ?? -1),
                )
              }
              onUpdateArrivalTime={(time) =>
                registrarHoraInvitado(
                  uuidInvitado(currentDetailItem, detailPersonIdx ?? -1),
                  "ingreso",
                  time,
                )
              }
              onUpdateDepartureTime={(time) =>
                registrarHoraInvitado(
                  uuidInvitado(currentDetailItem, detailPersonIdx ?? -1),
                  "salida",
                  time,
                )
              }
              onToggleDeparture={(registered) =>
                registrarHoraInvitado(
                  uuidInvitado(currentDetailItem, detailPersonIdx ?? -1),
                  "salida",
                  registered ? formatTime(new Date()) : "",
                )
              }
              onUpdateEntryNotes={(notes) =>
                actualizarVisita(currentDetailItem.uuid ?? "", {
                  anotacionesIngreso: notes,
                })
              }
              onUpdateExitNotes={(notes) =>
                actualizarVisita(currentDetailItem.uuid ?? "", {
                  anotacionesSalida: notes,
                })
              }
              onAddEntryPhotos={(photos) =>
                actualizarVisita(currentDetailItem.uuid ?? "", {
                  fotosIngreso: [
                    ...(currentDetailItem.fotosIngreso || []),
                    ...photos,
                  ],
                })
              }
              onAddExitPhotos={(photos) =>
                actualizarVisita(currentDetailItem.uuid ?? "", {
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
                    setParkingItem(currentDetailItem);
              }}
              onRegisterExit={() =>
                registrarHoraInvitado(
                  uuidInvitado(currentDetailItem, detailPersonIdx ?? -1),
                  "salida",
                  formatTime(new Date()),
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
                    setParkingItem(currentDetailItem);
              }}
              assignedSpots={
                cuposPorVisita[(currentDetailItem as any).uuid] ?? []
              }
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
            eliminarVisita(deleteItem.uuid ?? "");
            setDeleteItem(null);
          }
        }}
        onCancel={() => setDeleteItem(null)}
      />

      <AsignarEstacionamientoModal
        visita={parkingItem}
        onClose={() => setParkingItem(null)}
      />

      <Modal
        visible={showSuscripcionModal}
        onClose={() => setShowSuscripcionModal(false)}
        title="VeciYo Huésped Temporal"
      >
        <View className="gap-4 items-center">
          <View
            className="w-full h-40 rounded-2xl items-center justify-center"
            style={{ backgroundColor: theme.colors.borderLight }}
          >
            <Text style={{ fontSize: 42 }}>▶️</Text>
          </View>
          <Text className="text-sm text-gray-700 text-center">
            Los primeros 30 días son gratuitos. Suscríbete y disfruta de todos
            los beneficios.
          </Text>
          <Button
            variant="primary"
            fullWidth
            onPress={() => {
              setShowSuscripcionModal(false);
              setShowPayment(true);
            }}
          >
            Suscribirse
          </Button>
        </View>
      </Modal>

      <SuscripcionPagoModal
        visible={showPayment}
        onClose={() => setShowPayment(false)}
        precio={precio}
        pagoSimulado={pagoSimulado}
        procesando={paymentLoading}
        onIrAlPago={irAlPago}
        onConfirmarSimulado={() =>
          confirmarPago(null, () =>
            navigation.navigate("HuespedesTemporales"),
          )
        }
      />
    </View>
  );
}
