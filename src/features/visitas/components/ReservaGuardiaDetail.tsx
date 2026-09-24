import { theme } from "@/config";
import React, { useState } from "react";
import { Image, Linking, Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker, {
  type DateTimePickerChangeEvent,
} from "@react-native-community/datetimepicker";
import { Badge, Modal, Toggle } from "@/shared/components";
import { ScreenLayout } from "@/shared/layouts";
import type { Invitado, VisitaItem } from "@/shared/types";
import { TIPO_LABELS } from "../constants";
import { TIPO_VISITA_ASSETS } from "./tipoVisitaAssets";
import { VisitaGuardiaDetail } from "./VisitaGuardiaDetail";
import { formatTime } from "@/shared/utils";

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

/**
 * Lo que ve el guardia al abrir una reserva.
 *
 * Tenia dos problemas, y el de aspecto era el menor. La tarjeta del huesped
 * temporal pintaba un recuadro lavanda con el texto "Foto extraida del
 * documento" y, girada quince grados como si fuera un sello, la firma
 * **"Roberto Hornado · Porteria"**: un nombre escrito a mano en el codigo,
 * heredado de la maqueta. Sobre una reserva de verdad eso afirma que una
 * persona concreta verifico el documento, y no lo verifico nadie.
 *
 * Ahora se muestra el documento cuando lo hay --`invitado.documentos`-- y,
 * cuando no, se dice que no se capturo. El proveedor de identidad sigue sin
 * cerrarse (R-68), asi que el caso normal hoy es el segundo.
 *
 * Lo demas era maquetacion: la tarjeta llevaba un `p-2` y ademas `px-4`
 * adentro, asi que la barra gris de los botones quedaba flotando sin llegar a
 * los bordes; los datos del huesped --documento, hora de ingreso-- solo salian
 * al abrir el modal; y las etiquetas de 8px no se leian.
 */
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

  const guests: Invitado[] = item.invitados.length
    ? item.invitados
    : [{ nombre: item.nombre, llego: Boolean(item.llego) }];
  const selectedGuest = selectedIndex === null ? null : guests[selectedIndex];
  const esHuespedTemporal = item.tipo === "huesped-temporal";

  const horaActual = () => formatTime(new Date());

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

  const placas = (item.vehiculos ?? [])
    .map((vehiculo) => vehiculo.placa)
    .filter(Boolean)
    .join(" · ");

  return (
    <ScreenLayout withScroll padding={false}>
      <View className="px-4 pb-8 gap-3">
        <Pressable
          onPress={onBack}
          className="flex-row items-center gap-1 py-2 self-start"
          hitSlop={8}
        >
          <Ionicons
            name="chevron-back"
            size={18}
            color={theme.colors.primary}
          />
          <Text className="text-sm font-semibold text-primary">
            Volver a reservas
          </Text>
        </Pressable>

        {/*
          La cabecera de la reserva, una sola vez. Antes cada huesped repetia la
          torre, el tipo y las fechas, asi que con tres huespedes lo mismo salia
          tres veces y no se distinguia lo que cambiaba de lo que no.
        */}
        <View className="rounded-2xl bg-white shadow-sm overflow-hidden">
          <View className="flex-row items-center gap-3 px-4 pt-4 pb-3">
            <Image
              source={TIPO_VISITA_ASSETS[item.tipo]}
              style={{ width: 44, height: 44, borderRadius: 22 }}
              resizeMode="cover"
            />
            <View className="flex-1">
              <Text
                className="text-base font-bold text-gray-900"
                numberOfLines={1}
              >
                {item.reserva ? `Reserva ${item.reserva}` : item.nombre}
              </Text>
              <Text className="text-sm text-gray-500" numberOfLines={1}>
                {[item.torre, item.depto].filter(Boolean).join(" · ")}
                {item.torre || item.depto ? " · " : ""}
                {TIPO_LABELS[item.tipo]}
              </Text>
            </View>
          </View>

          <View className="flex-row flex-wrap gap-x-5 gap-y-2 px-4 pb-3">
            <Dato
              icono="calendar-outline"
              etiqueta="Desde"
              valor={item.fechaDesde}
            />
            <Dato
              icono="calendar-outline"
              etiqueta="Hasta"
              valor={item.fechaHasta}
            />
            <Dato
              icono="people-outline"
              etiqueta="Huéspedes"
              valor={String(guests.length)}
            />
          </View>

          {esHuespedTemporal && Boolean(item.reserva) && (
            <View className="px-4 pb-3">
              <Dato
                icono="person-outline"
                etiqueta="Responsable"
                valor={item.nombre}
              />
            </View>
          )}

          <View className="flex-row flex-wrap items-center gap-2 px-4 pb-4">
            {/*
              `Rechazado` se muestra como `Pendiente`: en la porteria una
              reserva rechazada no le dice al guardia que hacer, y el estado que
              le sirve es que todavia no puede entrar.
            */}
            <Badge
              status={item.estado === "Rechazado" ? "Pendiente" : item.estado}
            />
            {item.aviso === "notificar_y_anunciar" &&
              item.telefonoResidente && (
                <Pressable
                  onPress={() =>
                    Linking.openURL(`tel:${item.telefonoResidente}`)
                  }
                  className="flex-row items-center gap-1 rounded-full px-3 py-1.5"
                  style={{ backgroundColor: theme.colors.primaryLight }}
                >
                  <Ionicons
                    name="call"
                    size={13}
                    color={theme.colors.primary}
                  />
                  <Text className="text-xs font-semibold text-primary">
                    {item.telefonoResidente}
                  </Text>
                </Pressable>
              )}
            {item.tieneVehiculo && (
              <Pastilla
                icono="car-outline"
                texto={placas || "Con vehículo"}
                fondo={theme.colors.borderLight}
                color={theme.colors.textSecondary}
              />
            )}
            {lugaresDisponibles > 0 && (
              <Pastilla
                icono="square-outline"
                texto={
                  lugaresDisponibles === 1
                    ? "1 lugar libre"
                    : `${lugaresDisponibles} lugares libres`
                }
                fondo={theme.colors.successSoft}
                color={theme.colors.success}
              />
            )}
          </View>
        </View>

        {guests.map((guest, index) => {
          // El indice que esperan las mutaciones: -1 cuando la visita no tiene
          // invitados y la tarjeta representa a la persona de la propia visita.
          const indiceMutacion = item.invitados.length ? index : -1;
          const documento = guest.documentos?.[0];
          // La visita sin invitados guarda el documento en `item.ci`; cuando
          // los tiene, cada uno lleva el suyo.
          const numeroDocumento =
            guest.documentoNumero || (indiceMutacion === -1 ? item.ci : "");

          return (
            <View
              key={guest.uuid ?? `${guest.nombre}-${index}`}
              className="rounded-2xl bg-white shadow-sm overflow-hidden"
            >
              <View className="flex-row items-center gap-3 px-4 pt-4 pb-3">
                <View
                  className="items-center justify-center"
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 14,
                    backgroundColor: theme.colors.bgMuted,
                  }}
                >
                  <Text className="text-xs font-bold text-gray-500">
                    {index + 1}
                  </Text>
                </View>
                <View className="flex-1">
                  <Text
                    className="text-base font-bold text-gray-900"
                    numberOfLines={1}
                  >
                    {guest.nombre}
                  </Text>
                  <Text className="text-xs text-gray-500" numberOfLines={1}>
                    {numeroDocumento
                      ? `${guest.tipoDocumento || "Documento"} ${numeroDocumento}`
                      : "Sin documento declarado"}
                    {guest.esMenor ? " · Menor de edad" : ""}
                  </Text>
                </View>
              </View>

              {esHuespedTemporal && (
                <View className="px-4 pb-3">
                  {documento ? (
                    <View
                      className="rounded-xl overflow-hidden"
                      style={{
                        height: 140,
                        borderWidth: 1,
                        borderColor: theme.colors.border,
                      }}
                    >
                      <Image
                        style={{ width: "100%", height: "100%" }}
                        source={{ uri: documento }}
                        resizeMode="cover"
                      />
                    </View>
                  ) : (
                    /*
                      Sin proveedor de identidad (R-68) no hay captura de
                      documento, y decirlo es lo unico honesto: el recuadro que
                      habia antes afirmaba lo contrario.
                    */
                    <View
                      className="rounded-xl items-center justify-center gap-1 py-5"
                      style={{
                        backgroundColor: theme.colors.bgMuted,
                        borderWidth: 1,
                        borderStyle: "dashed",
                        borderColor: theme.colors.border,
                      }}
                    >
                      <Ionicons
                        name="id-card-outline"
                        size={26}
                        color={theme.colors.textMuted}
                      />
                      <Text className="text-xs text-gray-400">
                        Sin documento capturado
                      </Text>
                    </View>
                  )}
                  {guest.ciVerificado && (
                    <View className="flex-row items-center gap-1 mt-2">
                      <Ionicons
                        name="shield-checkmark"
                        size={14}
                        color={theme.colors.success}
                      />
                      <Text className="text-xs font-semibold text-green-700">
                        Documento verificado en portería
                      </Text>
                    </View>
                  )}
                </View>
              )}

              {esHuespedTemporal && (
                <View className="px-4 pb-3 gap-3 border-t border-gray-100 pt-3">
                  <View className="flex-row items-center justify-between">
                    <Text className="text-sm text-gray-900">
                      Registrar llegada
                    </Text>
                    <Toggle
                      value={Boolean(guest.llego)}
                      onChange={(value) =>
                        onToggleArrival?.(indiceMutacion, value)
                      }
                    />
                  </View>
                  <View className="flex-row gap-2">
                    <HoraCampo
                      label="Ingreso"
                      value={guest.horaIngreso}
                      onPress={() => setTimePicker({ index, field: "arrival" })}
                    />
                    <HoraCampo
                      label="Salida"
                      value={guest.horaSalida}
                      showWarning={Boolean(guest.horaSalida)}
                      onPress={() =>
                        setTimePicker({ index, field: "departure" })
                      }
                    />
                  </View>
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

              <View className="flex-row border-t border-gray-100">
                {onAssignParking && (
                  <Pressable
                    onPress={() => onAssignParking(index)}
                    className="flex-1 flex-row items-center justify-center gap-1.5 py-3.5 border-r border-gray-100"
                  >
                    <Ionicons
                      name="car-outline"
                      size={16}
                      color={theme.colors.textStrong}
                    />
                    <Text
                      className="text-sm font-semibold text-gray-700"
                      numberOfLines={1}
                    >
                      Estacionamiento
                    </Text>
                  </Pressable>
                )}
                <Pressable
                  onPress={() => setSelectedIndex(index)}
                  className="flex-1 flex-row items-center justify-center gap-1 py-3.5"
                >
                  <Text
                    className="text-sm font-semibold text-primary"
                    numberOfLines={1}
                  >
                    Ver detalles
                  </Text>
                  <Ionicons
                    name="chevron-forward"
                    size={15}
                    color={theme.colors.primary}
                  />
                </Pressable>
              </View>
            </View>
          );
        })}

        {selectedGuest && (
          <Modal
            visible
            onClose={() => setSelectedIndex(null)}
            title={selectedGuest.nombre}
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

/** Un dato con su etiqueta. Se omite entero si no hay valor: media etiqueta suelta confunde mas que la ausencia. */
function Dato({
  icono,
  etiqueta,
  valor,
}: {
  icono: React.ComponentProps<typeof Ionicons>["name"];
  etiqueta: string;
  valor?: string;
}) {
  if (!valor) return null;

  return (
    <View className="flex-row items-center gap-1.5">
      <Ionicons name={icono} size={14} color={theme.colors.textMuted} />
      <Text className="text-xs text-gray-400">{etiqueta}</Text>
      <Text className="text-xs font-semibold text-gray-900">{valor}</Text>
    </View>
  );
}

function Pastilla({
  icono,
  texto,
  fondo,
  color,
}: {
  icono: React.ComponentProps<typeof Ionicons>["name"];
  texto: string;
  fondo: string;
  color: string;
}) {
  return (
    <View
      className="flex-row items-center gap-1 rounded-full px-3 py-1.5"
      style={{ backgroundColor: fondo }}
    >
      <Ionicons name={icono} size={13} color={color} />
      <Text className="text-xs font-semibold" style={{ color }}>
        {texto}
      </Text>
    </View>
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
    <Pressable
      onPress={onPress}
      className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5"
    >
      <View className="flex-row items-center gap-1">
        <Text className="text-xs text-gray-400">{label}</Text>
        {showWarning && (
          <Ionicons
            name="alert-circle"
            size={12}
            color={theme.colors.warningDark}
          />
        )}
      </View>
      <Text className="text-base font-semibold text-gray-900">
        {value || "--:--"}
      </Text>
    </Pressable>
  );
}
