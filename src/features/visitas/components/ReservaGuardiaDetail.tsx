import React, { useState } from "react";
import { Image, Pressable, Text, View } from "react-native";
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
  onToggleArrival?: (guestIndex: number, arrived: boolean) => void;
  onUpdateArrivalTime?: (guestIndex: number, time: string) => void;
  onUpdateDepartureTime?: (guestIndex: number, time: string) => void;
}

export function ReservaGuardiaDetail({
  item,
  onBack,
  parkingModal,
  onAssignParking,
  onToggleArrival,
  onUpdateArrivalTime,
  onUpdateDepartureTime,
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
    const value = `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
    if (picker.field === "arrival") onUpdateArrivalTime?.(picker.index, value);
    else onUpdateDepartureTime?.(picker.index, value);
  };

  return (
    <ScreenLayout withScroll padding={false}>
      <View className="px-4 pb-6 gap-3">
        <Pressable onPress={onBack} className="pb-2 self-start">
          <Text className="text-sm font-semibold text-primary">
            ← Volver a reservas
          </Text>
        </Pressable>

        <View className="gap-3">
          {guests.map((guest, index) => (
            <View
              key={`${guest.nombre}-${index}`}
              className="rounded-2xl bg-white overflow-hidden shadow-sm"
            >
              <View className="p-3.5 pb-2.5">
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
                      <Badge
                        status={
                          item.estado === "Rechazado"
                            ? "Pendiente"
                            : item.estado
                        }
                      />
                    </View>
                    <Text className="text-sm text-gray-500">
                      {item.torre} - {item.depto} · {TIPO_LABELS[item.tipo]}
                    </Text>
                  </View>
                </View>
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
                  <Text style={{ fontSize: 36, color: "#6B7280" }}>👤</Text>
                  <Text className="text-[8px] text-gray-500">
                    Foto extraída del documento
                  </Text>
                  <Text
                    className="absolute bottom-1 text-[8px] text-gray-400"
                    style={{ backgroundColor: "rgba(255,255,255,0.8)" }}
                  >
                    Roberto Hornado · Portería
                  </Text>
                </View>
                <View className="flex-row flex-wrap gap-2 mt-3">
                  <Text className="text-xs text-gray-500">
                    📅 {item.fechaDesde}
                    {item.fechaHasta ? ` a ${item.fechaHasta}` : ""}
                  </Text>
                  {guest.horaSalida && (
                    <Text className="text-xs text-amber-800">⚠ Salida</Text>
                  )}
                </View>
              </View>
              <View className="flex-row flex-wrap items-center gap-3 mt-3 pt-3 border-t border-gray-100">
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
                <TimeField
                  label="Ingreso"
                  value={guest.horaIngreso}
                  onPress={() => setTimePicker({ index, field: "arrival" })}
                />
                <TimeField
                  label="Salida"
                  value={guest.horaSalida}
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
              <View className="flex-row gap-2 px-3.5 py-2.5 border-t border-gray-100">
                {onAssignParking && (
                  <Pressable
                    onPress={() => onAssignParking(index)}
                    className="flex-1 rounded-full bg-gray-100 py-2"
                  >
                    <Text className="text-xs font-semibold text-gray-700 text-center">
                      🅿️ Estacionamiento
                    </Text>
                  </Pressable>
                )}
                <Pressable
                  onPress={() => setSelectedIndex(index)}
                  className="flex-1 rounded-full bg-gray-100 py-2"
                >
                  <Text className="text-xs font-semibold text-primary text-center">
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
            title={selectedGuest.nombre}
          >
            <VisitaGuardiaDetail
              item={item}
              personIndex={selectedIndex}
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

function TimeField({
  label,
  value,
  onPress,
}: {
  label: string;
  value?: string;
  onPress: () => void;
}) {
  return (
    <View className="flex-row items-center gap-1">
      <Text className="text-xs text-gray-500">{label}</Text>
      <Pressable
        onPress={onPress}
        className="rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1.5"
      >
        <Text className="text-xs text-gray-900">{value || "--:--"}</Text>
      </Pressable>
    </View>
  );
}
