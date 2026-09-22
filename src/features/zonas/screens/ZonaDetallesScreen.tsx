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
import { ZonaBanner } from "@/features/zonas/components";
import { useZonas } from "@/features/zonas/hooks";
import { formatZonaDateParam } from "../helpers";
import { formatDate } from "@/shared/utils";
import { useUnidadesDisponibles } from "@/shared/hooks";

const DAYS = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
];
const normalizeText = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

function parseHorario(horario: string) {
  const match = horario
    .toLowerCase()
    .match(/(\d{1,2})[:\s]*(\d{2})?.*?(?:a|-)\s*(\d{1,2})[:\s]*(\d{2})?/);
  if (!match) return null;
  const from = Number(match[1]) * 60 + Number(match[2] || 0);
  const to = Number(match[3]) * 60 + Number(match[4] || 0);
  if (Number.isNaN(from) || Number.isNaN(to)) return null;
  return { from, to };
}
const FREE_HOURS = Array.from({ length: 29 }, (_, index) => {
  const minutes = 8 * 60 + index * 30;
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
});
export function ZonaDetallesScreen() {
  const navigation = useNavigation<any>();
  // Los departamentos salen de las unidades reales del edificio, no de una
  // lista fija con codigos que no existen.
  const { codigosDe } = useUnidadesDisponibles();
  const route = useRoute<any>();
  const zonaId = route.params?.zonaId as string;
  const rol = useAuthStore((state) => state.rolActivo);
  const usuario = useAuthStore((state) => state.usuario);
  const ubicaciones = useUbicacionStore((state) => state.ubicaciones);
  const {
    reservas,
    zonasComunesConfig,
    cargando,
    actualizarEstadoReserva,
    eliminarReserva,
    actualizarPersonaReserva,
  } = useZonas();
  // Antes caia a `zonasComunes[0]` -- la piscina inventada -- cuando el id no
  // existia, asi que una zona borrada mostraba los datos de otra.
  const zonaConfig = zonasComunesConfig[zonaId];
  const zona = zonaConfig;
  const esGuardiaAdmin = rol === "guardia" || rol === "administrador";
  const esGuardia = rol === "guardia";
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [dayFilter, setDayFilter] = useState<"hoy" | "manana" | null>("hoy");
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [fechaDesde, setFechaDesde] = useState<Date | null>(null);
  const [fechaHasta, setFechaHasta] = useState<Date | null>(null);
  const [datePicker, setDatePicker] = useState<"desde" | "hasta" | null>(null);
  const [deptoReservaOpen, setDeptoReservaOpen] = useState(false);
  const [deptoReserva, setDeptoReserva] = useState("");
  const [deptoReservaTarget, setDeptoReservaTarget] = useState<{
    horaPre?: string;
    fechaPre?: string;
  } | null>(null);
  const [menuItem, setMenuItem] = useState<ReservaZona | null>(null);
  const [detailItem, setDetailItem] = useState<ReservaZona | null>(null);
  const [deleteItem, setDeleteItem] = useState<ReservaZona | null>(null);
  const [incidenciaItem, setIncidenciaItem] = useState<ReservaZona | null>(
    null,
  );
  const [incidenciaTexto, setIncidenciaTexto] = useState("");
  const [ruleOpen, setRuleOpen] = useState(false);
  const [personNames, setPersonNames] = useState<string[]>([]);

  const abrirReserva = (horaPre = "", fechaPre = "") => {
    if (esGuardiaAdmin) {
      setDeptoReserva("");
      setDeptoReservaTarget({ horaPre, fechaPre });
      setDeptoReservaOpen(true);
      return;
    }
    navigation.navigate("ZonaReservar", {
      zonaId,
      horaPre,
      fechaPre,
      deptoReserva:
        ubicaciones.find((item) => item.favorito)?.codigo ?? codigosDe()[0] ?? "",
    });
  };

  const dateInRange = (value: string | undefined) => {
    if (!fechaDesde && !fechaHasta) return true;
    if (!value) return false;
    const [day, month, year] = value.split("/").map(Number);
    const date = new Date(year, month - 1, day);
    const start = fechaDesde
      ? new Date(
          fechaDesde.getFullYear(),
          fechaDesde.getMonth(),
          fechaDesde.getDate(),
        )
      : null;
    const end = fechaHasta
      ? new Date(
          fechaHasta.getFullYear(),
          fechaHasta.getMonth(),
          fechaHasta.getDate(),
        )
      : null;
    return (!start || date >= start) && (!end || date <= end);
  };

  const zoneReservations = useMemo(
    () =>
      reservas.filter((reservation) => {
        if (reservation.zonaId !== zonaId) return false;
        if (esGuardiaAdmin) return true;
        const name = usuario?.nombre?.toLowerCase() || "";
        return (
          !name ||
          reservation.esMia ||
          reservation.nombre.toLowerCase().includes(name)
        );
      }),
    [reservas, zonaId, esGuardiaAdmin, usuario?.nombre],
  );
  const allZoneReservations = useMemo(
    () => reservas.filter((reservation) => reservation.zonaId === zonaId),
    [reservas, zonaId],
  );

  const filtered = useMemo(
    () =>
      zoneReservations.filter((reservation) => {
        const term = search.toLowerCase();
        if (term && !reservation.depto.toLowerCase().includes(term))
          return false;
        if (activeTab && reservation.estado !== activeTab) return false;
        if (!dateInRange(reservation.fecha)) return false;
        if (dayFilter) {
          const target = new Date();
          if (dayFilter === "manana") target.setDate(target.getDate() + 1);
          const day = DAYS[target.getDay()].toLowerCase();
          if (!reservation.horario.toLowerCase().startsWith(day)) return false;
        }
        if (selectedDate) {
          const date = reservation.fecha?.split("/").reverse().join("-");
          const selected = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, "0")}-${String(selectedDate.getDate()).padStart(2, "0")}`;
          if (date && date !== selected) return false;
        }
        return true;
      }),
    [
      zoneReservations,
      search,
      activeTab,
      dayFilter,
      selectedDate,
      fechaDesde,
      fechaHasta,
    ],
  );

  const relevantDays = useMemo(() => {
    if (dayFilter === "hoy") return [normalizeText(DAYS[new Date().getDay()])];
    if (dayFilter === "manana") {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      return [normalizeText(DAYS[tomorrow.getDay()])];
    }
    return [];
  }, [dayFilter]);

  const freeHours = FREE_HOURS.map((hour) => {
    const start = Number(hour.slice(0, 2)) * 60 + Number(hour.slice(3));
    const reservations = allZoneReservations.filter((reservation) => {
      const parsed = parseHorario(reservation.horario);
      if (!parsed) return false;
      const horarioNormalizado = normalizeText(reservation.horario);
      const reservationDay = DAYS.find((day) =>
        horarioNormalizado.includes(normalizeText(day)),
      );
      // Los horarios con un día explícito pertenecen al listado histórico y
      // no deben ocupar los slots de la grilla, igual que en la web.
      if (reservationDay) return false;
      return start >= parsed.from && start < parsed.to;
    });
    return { hour, reservations };
  });

  const openPeople = (item: ReservaZona) => {
    setDetailItem(item);
    setPersonNames(item.personas.map((person) => person.nombre));
  };

  // La zona puede no existir: la pantalla se abre con un id de la ruta.
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
            shadowColor: "#000",
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
                      dayFilter === "hoy" ? theme.colors.primary : theme.colors.bgCard,
                    borderWidth: 1.5,
                    borderColor: dayFilter === "hoy" ? theme.colors.primary : theme.colors.border,
                  }}
                >
                  <Text
                    className="text-xs font-semibold"
                    style={{ color: dayFilter === "hoy" ? "#fff" : theme.colors.textSecondary }}
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
                      dayFilter === "manana" ? theme.colors.primary : theme.colors.bgCard,
                    borderWidth: 1.5,
                    borderColor: dayFilter === "manana" ? theme.colors.primary : theme.colors.border,
                  }}
                >
                  <Text
                    className="text-xs font-semibold"
                    style={{
                      color: dayFilter === "manana" ? "#fff" : theme.colors.textSecondary,
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
                    {fechaDesde
                      ? formatDate(fechaDesde)
                      : "Seleccionar fecha"}
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
                    {fechaHasta
                      ? formatDate(fechaHasta)
                      : "Seleccionar fecha"}
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
                        Todos: { bg: theme.colors.text, color: theme.colors.bgCard },
                        Reservado: { bg: theme.colors.warning, color: theme.colors.bgCard },
                        Aprobado: { bg: theme.colors.secondary, color: theme.colors.bgCard },
                        Pendiente: { bg: theme.colors.border, color: theme.colors.textSecondary },
                        "No disponible": { bg: theme.colors.danger, color: theme.colors.bgCard },
                        Disponible: { bg: theme.colors.success, color: theme.colors.bgCard },
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
            shadowColor: "#000",
            shadowOpacity: 0.08,
            shadowRadius: 8,
            shadowOffset: { width: 0, height: 2 },
          }}
        >
          <Text className="text-sm font-semibold text-gray-900 mb-2">
            {zona.usaSlots
              ? "Horarios disponibles"
              : `Horario libre (máx ${zonaConfig?.duracionPermitida || zona.duracionMaxima} h)`}
          </Text>
          {!dayFilter && !fechaDesde && !fechaHasta ? (
            <Text className="text-xs text-gray-500">
              Selecciona Hoy, Mañana o un rango de fechas para ver los horarios.
            </Text>
          ) : (
            freeHours.map(({ hour, reservations }) => (
              <View key={hour} className="flex-row border-b border-gray-100">
                <Text className="w-14 py-2.5 pr-2 text-right text-xs font-medium text-gray-500">
                  {hour}
                </Text>
                <View className="flex-1 min-h-[56px] justify-center border-l border-gray-100 px-2 py-1.5">
                  {reservations.length > 0 ? (
                    reservations.map((reservation) => {
                      const isMine =
                        !esGuardiaAdmin &&
                        (reservation.esMia ||
                          reservation.nombre
                            .toLowerCase()
                            .includes((usuario?.nombre || "").toLowerCase()));
                      const color =
                        reservation.estado === "Aprobado"
                          ? theme.colors.success
                          : reservation.estado === "Pendiente"
                            ? theme.colors.warning
                            : theme.colors.textSecondary;
                      return (
                        <Pressable
                          key={reservation.id}
                          onPress={() =>
                            (esGuardiaAdmin || isMine) &&
                            setMenuItem(reservation)
                          }
                          className="mb-1 rounded-lg px-2 py-1.5"
                          style={{
                            backgroundColor:
                              esGuardiaAdmin || isMine
                                ? `${color}18`
                                : theme.colors.borderLight,
                            borderLeftWidth: 3,
                            borderLeftColor: color,
                            opacity: esGuardiaAdmin || isMine ? 1 : 0.5,
                          }}
                        >
                          <Text className="text-xs font-semibold text-gray-900">
                            {esGuardiaAdmin
                              ? `${reservation.depto} · ${reservation.nombre}`
                              : isMine
                                ? `Reserva N°:${reservation.reservaNum}`
                                : "Ocupado"}
                          </Text>
                          <Text className="mt-0.5 text-[10px] text-gray-500">
                            {reservation.horario}
                          </Text>
                        </Pressable>
                      );
                    })
                  ) : (
                    <Pressable
                      onPress={() =>
                        abrirReserva(
                          hour,
                          formatZonaDateParam(
                            fechaDesde || selectedDate || new Date(),
                          ),
                        )
                      }
                      className="items-center rounded-lg border border-dashed border-gray-300 px-2 py-2"
                    >
                      <Text className="text-xs font-semibold text-green-600">
                        + Reservar
                      </Text>
                    </Pressable>
                  )}
                </View>
              </View>
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
                      actualizarEstadoReserva(menuItem.uuid ?? "", "Disponible");
                      setMenuItem(null);
                    }}
                  />
                  <BottomSheetOption
                    label="Estado: No disponible"
                    onPress={() => {
                      actualizarEstadoReserva(menuItem.uuid ?? "", "No disponible");
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
