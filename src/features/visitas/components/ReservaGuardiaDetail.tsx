import React, { useState } from "react";
import { Image, Linking, Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker, {
  type DateTimePickerChangeEvent,
} from "@react-native-community/datetimepicker";
import { Badge, Modal, Toggle } from "@/shared/components";
import { ScreenLayout } from "@/shared/layouts";
import type { VisitaItem } from "@/shared/types";
import { TIPO_LABELS } from "@/data";
import { TIPO_VISITA_ASSETS } from "./tipoVisitaAssets";
import { VisitaGuardiaDetail } from "./VisitaGuardiaDetail";

interface Props {
  item: VisitaItem;
  onBack: () => void;
  parkingModal?: React.ReactNode;
  onAssignParking?: (guestIndex: number) => void;
  onToggleInstruction?: () => void;
  onCallAnnounce?: () => void;
  onUpdateEntryNotes?: (notes: string) => void;
  onUpdateExitNotes?: (notes: string) => void;
  onAddEntryPhotos?: (photos: string[]) => void;
  onAddExitPhotos?: (photos: string[]) => void;
  onToggleArrival?: (guestIndex: number, arrived: boolean) => void;
  onVerifyDocument?: (guestIndex: number) => void;
  onUpdateArrivalTime?: (guestIndex: number, time: string) => void;
  onUpdateDepartureTime?: (guestIndex: number, time: string) => void;
  lugaresDisponibles?: number;
}

export function ReservaGuardiaDetail({
  item,
  onBack,
  parkingModal,
  onAssignParking,
  onToggleInstruction,
  onCallAnnounce,
  onUpdateEntryNotes,
  onUpdateExitNotes,
  onAddEntryPhotos,
  onAddExitPhotos,
  onToggleArrival,
  onVerifyDocument,
  onUpdateArrivalTime,
  onUpdateDepartureTime,
  lugaresDisponibles = 0,
}: Props) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [timePicker, setTimePicker] = useState<{
    index: number;
    field: "arrival" | "departure";
  } | null>(null);
  const guests = item.invitados.length
    ? item.invitados
    : [{ nombre: item.nombre, llego: Boolean(item.llego) }];
  const selectedGuest = selectedIndex === null ? null : guests[selectedIndex];
  const esHuespedTemporal = item.tipo === "huesped-temporal";

  const horaActual = () =>
    new Date().toLocaleTimeString("es-AR", {
      hour: "2-digit",
      minute: "2-digit",
    });

  const parseTime = (value?: string) => {
    const [hours = "0", minutes = "0"] = (value || "00:00").split(":");
    const date = new Date();
    date.setHours(Number(hours), Number(minutes), 0, 0);
    return date;
  };

  const handleTimeChange = (_event: DateTimePickerChangeEvent, date: Date) => {
    const picker = timePicker;
    setTimePicker(null);
    if (!picker || !date) return;
    const value = `${String(date.getHours()).padStart(2, "0")}:${String(
      date.getMinutes(),
    ).padStart(2, "0")}`;
    if (picker.field === "arrival") onUpdateArrivalTime?.(picker.index, value);
    else onUpdateDepartureTime?.(picker.index, value);
  };

  return (
    <ScreenLayout withScroll padding={false}>
      <View className="px-4 pb-6 gap-3">
        <Pressable onPress={onBack} className="p-2 self-start">
          <Text className="text-sm font-semibold text-primary">
            ← Volver a reservas
          </Text>
        </Pressable>

        <View className="gap-3">
          {guests.map((guest, index) => (
            <View
              key={`${guest.nombre}-${index}`}
              className="rounded-2xl bg-white overflow-hidden shadow-sm p-2"
            >
              <View className="px-4 pt-3.5 pb-2.5">
                <View className="flex-row items-center gap-2.5">
                  <Image
                    source={TIPO_VISITA_ASSETS[item.tipo]}
                    className="w-10 h-10 rounded-full"
                    resizeMode="cover"
                  />
                  <View className="flex-1">
                    <View className="flex-row items-center justify-between gap-2">
                      <Text className="text-base font-bold text-gray-900 flex-1">
                        {guest.nombre}
                      </Text>
                      {esHuespedTemporal && (
                        <Badge
                          status={
                            item.estado === "Rechazado"
                              ? "Pendiente"
                              : item.estado
                          }
                        />
                      )}
                    </View>
                    <Text className="text-sm text-gray-500">
                      {item.torre} - {item.depto} · {TIPO_LABELS[item.tipo]}
                    </Text>
                  </View>
                </View>
                {esHuespedTemporal && (
                  <>
                    <Text className="text-xs text-gray-400 mt-1">
                      Huésped responsable: {item.nombre}
                    </Text>
                    <View
                      className="mt-2 rounded-lg items-center justify-center overflow-hidden"
                      style={{
                        height: 90,
                        backgroundColor: "#C5CAE9",
                        borderWidth: 1,
                        borderColor: "#E5E7EB",
                      }}
                    >
                      <Ionicons
                        name="person-outline"
                        size={36}
                        color="#6B7280"
                      />
                      <Text className="text-[8px] text-gray-500">
                        Foto extraída del documento
                      </Text>
                      <Text
                        className="absolute bottom-1 text-[8px] text-gray-400"
                        style={{
                          backgroundColor: "rgba(255,255,255,0.8)",
                          transform: [{ rotate: "-15deg" }],
                          paddingHorizontal: 3,
                        }}
                      >
                        Roberto Hornado · Portería
                      </Text>
                    </View>
                  </>
                )}
                <View className="flex-row flex-wrap gap-2 mt-3">
                  <Text className="text-xs text-gray-500">
                    📅 {item.fechaDesde}
                    {item.fechaHasta ? ` a ${item.fechaHasta}` : ""}
                  </Text>
                  {guest.horaSalida && (
                    <Text className="text-xs text-amber-800">⚠ Salida</Text>
                  )}
                </View>
                {!esHuespedTemporal && (
                  <View className="flex-row flex-wrap gap-1.5 mt-2">
                    {item.tipoNotificacion === "notificar-y-anunciar" &&
                      item.telefonoResidente && (
                        <Pressable
                          onPress={() =>
                            Linking.openURL(`tel:${item.telefonoResidente}`)
                          }
                          className="rounded-full px-2 py-0.5"
                          style={{ backgroundColor: "#FFF8E1" }}
                        >
                          <Text className="text-[11px] text-primary">
                            📞 {item.telefonoResidente}
                          </Text>
                        </Pressable>
                      )}
                    {item.tieneVehiculo && (
                      <View
                        className="rounded-full px-2 py-0.5"
                        style={{ backgroundColor: "#F3F4F6" }}
                      >
                        <Text className="text-[11px] text-gray-500">
                          🚗{" "}
                          {item.vehiculos?.length
                            ? item.vehiculos
                                .map((vehicle) => vehicle.placa)
                                .filter(Boolean)
                                .join(",")
                            : "Con vehículo"}
                        </Text>
                      </View>
                    )}
                    {item.tipo === "temporal" && item.ci && (
                      <View
                        className="rounded-full px-2 py-0.5"
                        style={{ backgroundColor: "#F3F4F6" }}
                      >
                        <Text className="text-[11px] text-gray-500">
                          🆔 DNI: {item.ci}
                        </Text>
                      </View>
                    )}
                    {lugaresDisponibles > 0 && (
                      <View
                        className="rounded-full px-2 py-0.5"
                        style={{ backgroundColor: "#F0FDF4" }}
                      >
                        <Text className="text-[11px] text-green-700">
                          🅿️ {lugaresDisponibles} libres
                        </Text>
                      </View>
                    )}
                  </View>
                )}
              </View>
              {esHuespedTemporal && (
                <View className="flex-row flex-wrap items-center gap-2.5 mt-2.5 pt-2.5 px-4 border-t border-gray-100">
                  <View className="flex-row items-center gap-1.5">
                    <Toggle
                      value={Boolean(guest.llego)}
                      onChange={(value) =>
                        onToggleArrival?.(
                          item.invitados.length ? index : -1,
                          value,
                        )
                      }
                    />
                    <Text className="text-xs text-gray-500">
                      {guest.llego ? "Llegó" : "No llegó"}
                    </Text>
                  </View>
                  <HoraCampo
                    label="Ingreso"
                    value={guest.horaIngreso}
                    onPress={() => setTimePicker({ index, field: "arrival" })}
                  />
                  <HoraCampo
                    label="Salida"
                    value={guest.horaSalida}
                    showWarning={Boolean(guest.horaSalida)}
                    onPress={() => setTimePicker({ index, field: "departure" })}
                  />
                  {timePicker?.index === index && (
                    <DateTimePicker
                      value={parseTime(
                        timePicker.field === "arrival"
                          ? guest.horaIngreso
                          : guest.horaSalida,
                      )}
                      mode="time"
                      is24Hour
                      display="default"
                      onValueChange={handleTimeChange}
                      onDismiss={() => setTimePicker(null)}
                    />
                  )}
                </View>
              )}
              <View className="flex-row bg-gray-100 border-t border-gray-100">
                {onAssignParking && (
                  <Pressable
                    onPress={() => onAssignParking(index)}
                    className="flex-1 py-2.5 border-r border-gray-200"
                  >
                    <Text className="text-sm font-semibold text-gray-700 text-center">
                      🅿️ Estacionamiento
                    </Text>
                  </Pressable>
                )}
                <Pressable
                  onPress={() => setSelectedIndex(index)}
                  className="flex-1 py-2.5"
                >
                  <Text className="text-sm font-semibold text-primary text-center">
                    Ver detalles →
                  </Text>
                </Pressable>
              </View>
            </View>
          ))}
        </View>
        {selectedGuest && (
          <Modal
            visible
            onClose={() => setSelectedIndex(null)}
            title={item.nombre}
          >
            <VisitaGuardiaDetail
              item={item}
              personIndex={selectedIndex}
              onToggleInstruction={onToggleInstruction}
              onVerifyDocument={() =>
                onVerifyDocument?.(
                  item.invitados.length ? (selectedIndex ?? -1) : -1,
                )
              }
              onAssignParking={() =>
                onAssignParking?.(
                  item.invitados.length ? (selectedIndex ?? -1) : -1,
                )
              }
              onCallAnnounce={onCallAnnounce}
              lugaresDisponibles={lugaresDisponibles}
              onToggleDeparture={(registered) =>
                onUpdateDepartureTime?.(
                  item.invitados.length ? (selectedIndex ?? -1) : -1,
                  registered ? horaActual() : "",
                )
              }
              onRegisterExit={() =>
                onUpdateDepartureTime?.(
                  item.invitados.length ? (selectedIndex ?? -1) : -1,
                  horaActual(),
                )
              }
              onUpdateEntryNotes={onUpdateEntryNotes}
              onUpdateExitNotes={onUpdateExitNotes}
              onAddEntryPhotos={onAddEntryPhotos}
              onAddExitPhotos={onAddExitPhotos}
              onToggleArrival={(arrived) =>
                onToggleArrival?.(
                  item.invitados.length ? (selectedIndex ?? -1) : -1,
                  arrived,
                )
              }
              onUpdateArrivalTime={(time) =>
                onUpdateArrivalTime?.(
                  item.invitados.length ? (selectedIndex ?? -1) : -1,
                  time,
                )
              }
              onUpdateDepartureTime={(time) =>
                onUpdateDepartureTime?.(
                  item.invitados.length ? (selectedIndex ?? -1) : -1,
                  time,
                )
              }
            />
          </Modal>
        )}
        {parkingModal}
      </View>
    </ScreenLayout>
  );
}

function HoraCampo({
  label,
  value,
  showWarning = false,
  onPress,
}: {
  label: string;
  value?: string;
  showWarning?: boolean;
  onPress: () => void;
}) {
  return (
    <View className="flex-row items-center gap-1">
      <Text className="text-sm text-gray-500">{label}</Text>
      <Pressable
        onPress={onPress}
        className="rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-2"
      >
        <Text className="text-sm text-gray-900">{value || "--:--"}</Text>
      </Pressable>
      {showWarning && (
        <Text className="rounded bg-amber-100 px-1 text-[10px] font-bold text-amber-800">
          ⚠
        </Text>
      )}
    </View>
  );
}
