import { theme } from "@/config";
import React, { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import {
  BottomSheet,
  BottomSheetOption,
  Button,
  Calendar,
  Input,
  Modal,
  SearchBar,
  Select,
  StatusTabs,
} from "@/shared/components";
import { useAuthStore, useUbicacionStore } from "@/stores";
import { PageHeader } from "@/shared/layouts";
import type { ReservaZona } from "@/shared/types";
import { FranjaHoraria, ZonaBanner } from "@/features/zonas/components";
import { useZonaDetalles } from "@/features/zonas/hooks/useZonaDetalles";
import { formatZonaDateParam, horasMaximas } from "../helpers";
import { formatDate } from "@/shared/utils";
import { useUnidadesDisponibles } from "@/shared/hooks";

/**
 * Detalle de una zona comun. Solo composicion: el estado y las reglas viven en
 * `useZonaDetalles`.
 */
export function ZonaDetallesScreen() {
  const {
    navigation,
    zonaId,
    zona,
    zonaConfig,
    cargando,
    rol,
    esGuardiaAdmin,
    esGuardia,
    codigosDe,
    ubicaciones,
    actualizarEstadoReserva,
    eliminarReserva,
    actualizarPersonaReserva,
    search,
    setSearch,
    activeTab,
    setActiveTab,
    filtersOpen,
    setFiltersOpen,
    dayFilter,
    setDayFilter,
    selectedDate,
    setSelectedDate,
    fechaDesde,
    setFechaDesde,
    fechaHasta,
    setFechaHasta,
    datePicker,
    setDatePicker,
    deptoReservaOpen,
    setDeptoReservaOpen,
    deptoReserva,
    setDeptoReserva,
    deptoReservaTarget,
    setDeptoReservaTarget,
    menuItem,
    setMenuItem,
    detailItem,
    setDetailItem,
    deleteItem,
    setDeleteItem,
    incidenciaItem,
    setIncidenciaItem,
    incidenciaTexto,
    setIncidenciaTexto,
    ruleOpen,
    setRuleOpen,
    personNames,
    setPersonNames,
    zoneReservations,
    allZoneReservations,
    filtered,
    relevantDays,
    freeHours,
    abrirReserva,
    openPeople,
  } = useZonaDetalles();

  if (!zona) {
    return (
      <View className="flex-1 bg-white">
        <PageHeader title="Zona común" />
        <Text className="text-center text-gray-500 py-10">
          {cargando ? "Cargando..." : "Esta zona común ya no está disponible."}
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white">
      <PageHeader
        title={zona.nombre}
        action={
          <Pressable
            onPress={() => abrirReserva()}
            className="w-8 h-8 rounded-lg items-center justify-center"
            style={{ backgroundColor: theme.colors.primary }}
          >
            <Text className="text-xl font-bold text-white">+</Text>
          </Pressable>
        }
      />
      <ScrollView className="flex-1" contentContainerClassName="p-3 gap-2.5">
        <ZonaBanner zona={zona} />
        <Pressable
          onPress={() => setRuleOpen(true)}
          className="items-center rounded-xl py-2.5 border border-gray-200"
        >
          <Text className="text-sm font-semibold text-gray-500">
            📋 Reglamento de la zona
          </Text>
        </Pressable>
        <View
          className="bg-white rounded-2xl p-3 gap-2.5"
          style={{
            elevation: 3,
            shadowColor: theme.colors.shadow,
            shadowOpacity: 0.08,
            shadowRadius: 8,
            shadowOffset: { width: 0, height: 2 },
          }}
        >
          <View className="flex-row items-center justify-between">
            <Text className="flex-1 text-sm font-semibold text-gray-900">
              Lista de reservas
            </Text>
            <Text className="text-sm text-gray-500 mr-2">Buscar y filtrar</Text>
            <Pressable onPress={() => setFiltersOpen((value) => !value)}>
              <Ionicons
                name={filtersOpen ? "chevron-up" : "chevron-down"}
                size={18}
                color={theme.colors.textSecondary}
              />
            </Pressable>
          </View>
          {filtersOpen && (
            <>
              <SearchBar
                value={search}
                onChange={setSearch}
                placeholder="Buscar por departamento"
              />
              <View className="flex-row gap-2">
                <Pressable
                  onPress={() => {
                    setDayFilter("hoy");
                    setSelectedDate(null);
                  }}
                  className="rounded-full px-3.5 py-1.5"
                  style={{
                    backgroundColor:
                      dayFilter === "hoy"
                        ? theme.colors.primary
                        : theme.colors.bgCard,
                    borderWidth: 1.5,
                    borderColor:
                      dayFilter === "hoy"
                        ? theme.colors.primary
                        : theme.colors.border,
                  }}
                >
                  <Text
                    className="text-xs font-semibold"
                    style={{
                      color:
                        dayFilter === "hoy"
                          ? theme.colors.textInverse
                          : theme.colors.textSecondary,
                    }}
                  >
                    Hoy
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    setDayFilter("manana");
                    setSelectedDate(null);
                  }}
                  className="rounded-full px-3.5 py-1.5"
                  style={{
                    backgroundColor:
                      dayFilter === "manana"
                        ? theme.colors.primary
                        : theme.colors.bgCard,
                    borderWidth: 1.5,
                    borderColor:
                      dayFilter === "manana"
                        ? theme.colors.primary
                        : theme.colors.border,
                  }}
                >
                  <Text
                    className="text-xs font-semibold"
                    style={{
                      color:
                        dayFilter === "manana"
                          ? theme.colors.textInverse
                          : theme.colors.textSecondary,
                    }}
                  >
                    Mañana
                  </Text>
                </Pressable>
              </View>
              <View className="flex-row items-center gap-2">
                <Pressable
                  onPress={() => {
                    setDatePicker("desde");
                    setDayFilter(null);
                  }}
                  className="flex-1 rounded-xl px-3 py-2 border border-gray-200"
                >
                  <Text className="text-[11px] text-gray-500">Desde</Text>
                  <Text className="text-sm text-gray-900">
                    {fechaDesde ? formatDate(fechaDesde) : "Seleccionar fecha"}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    setDatePicker("hasta");
                    setDayFilter(null);
                  }}
                  className="flex-1 rounded-xl px-3 py-2 border border-gray-200"
                >
                  <Text className="text-[11px] text-gray-500">Hasta</Text>
                  <Text className="text-sm text-gray-900">
                    {fechaHasta ? formatDate(fechaHasta) : "Seleccionar fecha"}
                  </Text>
                </Pressable>
                {(fechaDesde || fechaHasta || dayFilter) && (
                  <Pressable
                    onPress={() => {
                      setFechaDesde(null);
                      setFechaHasta(null);
                      setDayFilter(null);
                    }}
                  >
                    <Text className="text-xs text-gray-500 underline">
                      Limpiar
                    </Text>
                  </Pressable>
                )}
              </View>
              <StatusTabs
                tabs={[
                  "Todos",
                  ...(esGuardia
                    ? ["Aprobado", "Pendiente", "Cancelado"]
                    : [
                        "Reservado",
                        "Aprobado",
                        "Pendiente",
                        "No disponible",
                        "Disponible",
                      ]),
                ]}
                active={activeTab || "Todos"}
                onChange={(value) =>
                  setActiveTab(value === "Todos" ? null : value)
                }
                centered
                statusColors={
                  esGuardia
                    ? undefined
                    : {
                        Todos: {
                          bg: theme.colors.text,
                          color: theme.colors.bgCard,
                        },
                        Reservado: {
                          bg: theme.colors.warning,
                          color: theme.colors.bgCard,
                        },
                        Aprobado: {
                          bg: theme.colors.secondary,
                          color: theme.colors.bgCard,
                        },
                        Pendiente: {
                          bg: theme.colors.border,
                          color: theme.colors.textSecondary,
                        },
                        "No disponible": {
                          bg: theme.colors.danger,
                          color: theme.colors.bgCard,
                        },
                        Disponible: {
                          bg: theme.colors.success,
                          color: theme.colors.bgCard,
                        },
                      }
                }
              />
            </>
          )}
        </View>
        <View
          className="bg-white rounded-2xl p-3"
          style={{
            elevation: 3,
            shadowColor: theme.colors.shadow,
            shadowOpacity: 0.08,
            shadowRadius: 8,
            shadowOffset: { width: 0, height: 2 },
          }}
        >
          <Text className="text-sm font-semibold text-gray-900 mb-2">
            {zona.usaSlots
              ? "Horarios disponibles"
              : `Horario libre (máx ${horasMaximas(zona.duracionMaximaMin)} h)`}
          </Text>
          {!dayFilter && !fechaDesde && !fechaHasta ? (
            <Text className="text-xs text-gray-500">
              Selecciona Hoy, Mañana o un rango de fechas para ver los horarios.
            </Text>
          ) : (
            freeHours.map(({ hour, reservations, ajenas, libres, cupos }) => (
              <FranjaHoraria
                key={hour}
                hora={hour}
                reservas={reservations}
                esGestion={esGuardiaAdmin}
                ajenas={ajenas}
                libres={libres}
                cupos={cupos}
                onSeleccionar={setMenuItem}
                onReservar={() =>
                  abrirReserva(
                    hour,
                    formatZonaDateParam(
                      fechaDesde || selectedDate || new Date(),
                    ),
                  )
                }
              />
            ))
          )}
        </View>
      </ScrollView>

      <BottomSheet visible={!!menuItem} onClose={() => setMenuItem(null)}>
        {esGuardia ? (
          <>
            <BottomSheetOption
              label="Editar personas en la reserva"
              onPress={() => {
                if (menuItem) openPeople(menuItem);
                setMenuItem(null);
              }}
            />
            <BottomSheetOption
              label="Añadir incidencia"
              onPress={() => {
                setIncidenciaItem(menuItem);
                setIncidenciaTexto("");
                setMenuItem(null);
              }}
            />
          </>
        ) : (
          menuItem && (
            <>
              {rol === "administrador" && menuItem.estado === "Pendiente" && (
                <>
                  <BottomSheetOption
                    label="Aprobar reserva"
                    onPress={() => {
                      actualizarEstadoReserva(menuItem.uuid ?? "", "Aprobado");
                      setMenuItem(null);
                    }}
                  />
                  <BottomSheetOption
                    label="Rechazar reserva"
                    variant="danger"
                    onPress={() => {
                      actualizarEstadoReserva(menuItem.uuid ?? "", "Rechazado");
                      setMenuItem(null);
                    }}
                  />
                </>
              )}
              {rol === "administrador" && (
                <>
                  <BottomSheetOption
                    label="Estado: Reservado"
                    onPress={() => {
                      actualizarEstadoReserva(menuItem.uuid ?? "", "Reservado");
                      setMenuItem(null);
                    }}
                  />
                  <BottomSheetOption
                    label="Estado: Disponible"
                    onPress={() => {
                      actualizarEstadoReserva(
                        menuItem.uuid ?? "",
                        "Disponible",
                      );
                      setMenuItem(null);
                    }}
                  />
                  <BottomSheetOption
                    label="Estado: No disponible"
                    onPress={() => {
                      actualizarEstadoReserva(
                        menuItem.uuid ?? "",
                        "No disponible",
                      );
                      setMenuItem(null);
                    }}
                  />
                </>
              )}
              <BottomSheetOption
                label="Eliminar"
                variant="danger"
                onPress={() => {
                  setDeleteItem(menuItem);
                  setMenuItem(null);
                }}
              />
            </>
          )
        )}
      </BottomSheet>
      <Modal
        visible={!!deleteItem}
        onClose={() => setDeleteItem(null)}
        title="Eliminar reserva"
      >
        <View className="gap-4">
          <Text className="text-sm text-gray-600 text-center">
            ¿Seguro que desea eliminar esta reserva? Esta acción no se puede
            deshacer.
          </Text>
          <View className="flex-row gap-3">
            <View className="flex-1">
              <Button variant="secondary" onPress={() => setDeleteItem(null)}>
                Cancelar
              </Button>
            </View>
            <View className="flex-1">
              <Button
                variant="danger"
                onPress={() => {
                  if (deleteItem) eliminarReserva(deleteItem.uuid ?? "");
                  setDeleteItem(null);
                }}
              >
                Eliminar
              </Button>
            </View>
          </View>
        </View>
      </Modal>
      <Modal
        visible={!!ruleOpen}
        onClose={() => setRuleOpen(false)}
        title="Reglamento de la zona"
      >
        <View className="gap-4">
          <Text className="font-bold text-base text-gray-900">
            {zona.nombre}
          </Text>
          <Text className="text-sm text-gray-700 leading-6">
            {zonaConfig?.reglas || "Esta zona no tiene reglamento definido."}
          </Text>
          <Button fullWidth onPress={() => setRuleOpen(false)}>
            Entendido
          </Button>
        </View>
      </Modal>
      <Modal
        visible={!!datePicker}
        onClose={() => setDatePicker(null)}
        title={datePicker === "desde" ? "Fecha desde" : "Fecha hasta"}
      >
        <Calendar
          selected={datePicker === "desde" ? fechaDesde : fechaHasta}
          onSelect={(date) => {
            if (datePicker === "desde") setFechaDesde(date);
            else setFechaHasta(date);
            setDatePicker(null);
          }}
        />
      </Modal>
      <Modal
        visible={deptoReservaOpen}
        onClose={() => setDeptoReservaOpen(false)}
        title="¿Para qué departamento es la reserva?"
      >
        <View className="gap-4">
          <Select
            label="Departamento"
            value={deptoReserva || null}
            options={codigosDe()}
            onChange={(value) => setDeptoReserva(String(value))}
            placeholder="Seleccione el departamento"
          />
          <Button
            fullWidth
            disabled={!deptoReserva}
            onPress={() => {
              setDeptoReservaOpen(false);
              navigation.navigate("ZonaReservar", {
                zonaId,
                ...deptoReservaTarget,
                deptoReserva,
              });
            }}
          >
            Continuar
          </Button>
        </View>
      </Modal>
      <Modal
        visible={!!detailItem}
        onClose={() => setDetailItem(null)}
        title="Editar personas"
      >
        <View className="gap-3">
          {detailItem &&
            personNames.map((name, index) => (
              <Input
                key={index}
                value={name}
                onChangeText={(value) =>
                  setPersonNames((current) =>
                    current.map((item, itemIndex) =>
                      itemIndex === index ? value : item,
                    ),
                  )
                }
                placeholder={`Nombre del asistente ${index + 1}`}
              />
            ))}
          <Button
            fullWidth
            onPress={() => {
              if (detailItem)
                // Cada participante se identifica por su uuid, no por su
                // posicion en el array.
                personNames.forEach((name, index) => {
                  const participante = detailItem.personas[index];
                  if (participante?.uuid)
                    actualizarPersonaReserva(participante.uuid, {
                      nombre: name,
                    });
                });
              setDetailItem(null);
            }}
          >
            Guardar cambios
          </Button>
        </View>
      </Modal>
      <Modal
        visible={!!incidenciaItem}
        onClose={() => {
          setIncidenciaItem(null);
          setIncidenciaTexto("");
        }}
        title="Registrar comentario o incidencia"
      >
        {incidenciaItem && (
          <View className="gap-4">
            <View className="rounded-2xl border-[1.5px] border-primary p-3.5 gap-1.5">
              <Text className="text-base font-bold text-gray-900">
                {incidenciaItem.depto}
              </Text>
              <Text className="text-sm text-gray-500">
                Reserva N°:{incidenciaItem.reservaNum} ·{" "}
                {incidenciaItem.horario}
              </Text>
            </View>
            <Input
              value={incidenciaTexto}
              onChangeText={setIncidenciaTexto}
              placeholder="Describa el comentario o incidencia..."
              multiline
              rows={5}
              showEditIcon={false}
            />
            <Button
              fullWidth
              disabled={!incidenciaTexto.trim()}
              onPress={() => {
                setIncidenciaItem(null);
                setIncidenciaTexto("");
              }}
            >
              Enviar a PQRs
            </Button>
          </View>
        )}
      </Modal>
    </View>
  );
}
