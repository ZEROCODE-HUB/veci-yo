import React, { useState } from "react";
import { Image, Pressable, Text, TextInput, View } from "react-native";
import DateTimePicker, {
  type DateTimePickerChangeEvent,
} from "@react-native-community/datetimepicker";
import * as ImagePicker from "expo-image-picker";
import type { VisitaItem } from "@/shared/types";
import { TIPO_LABELS } from "@/data";
import { Button, Modal, Toggle } from "@/shared/components";

interface Props {
  item: VisitaItem;
  personIndex?: number | null;
  onToggleArrival?: (arrived: boolean) => void;
  onToggleInstruction?: () => void;
  onVerifyDocument?: () => void;
  onUpdateArrivalTime?: (time: string) => void;
  onUpdateDepartureTime?: (time: string) => void;
  onToggleDeparture?: (registered: boolean) => void;
  onUpdateEntryNotes?: (notes: string) => void;
  onUpdateExitNotes?: (notes: string) => void;
  onAddEntryPhotos?: (photos: string[]) => void;
  onAddExitPhotos?: (photos: string[]) => void;
  onCallAnnounce?: () => void;
  lugaresDisponibles?: number;
  onAssignParking?: () => void;
  onRegisterExit?: () => void;
}

export function VisitaGuardiaDetail({
  item,
  personIndex = null,
  onToggleArrival,
  onToggleInstruction,
  onVerifyDocument,
  onUpdateArrivalTime,
  onUpdateDepartureTime,
  onToggleDeparture,
  onUpdateEntryNotes,
  onUpdateExitNotes,
  onAddEntryPhotos,
  onAddExitPhotos,
  onCallAnnounce,
  lugaresDisponibles = 0,
  onAssignParking,
  onRegisterExit,
}: Props) {
  const [verificationVisible, setVerificationVisible] = useState(false);
  const [ciInput, setCiInput] = useState("");
  const [ciError, setCiError] = useState("");
  const [timePicker, setTimePicker] = useState<"arrival" | "departure" | null>(
    null,
  );

  const persona =
    personIndex === -1
      ? {
          nombre: item.nombre,
          ci: item.ci,
          horaIngreso: item.horaIngreso,
          horaSalida: item.horaSalida,
          llego: item.llego,
          ciVerificado: item.ciVerificado,
        }
      : personIndex !== null && personIndex !== undefined
        ? item.invitados?.[personIndex]
        : undefined;
  const nombrePersona = persona?.nombre || item.nombre;
  const identificacion =
    (persona && "ci" in persona ? persona.ci : undefined) || item.ci;
  const horaIngreso = persona?.horaIngreso || item.horaIngreso;
  const horaSalida = persona?.horaSalida || item.horaSalida;
  const llego =
    persona && "llego" in persona ? persona.llego : (item.llego ?? false);
  const ciVerificado =
    persona && "ciVerificado" in persona
      ? persona.ciVerificado
      : (item.ciVerificado ?? false);
  const instruccionCumplida = !!item.instruccionesCumplidas?.llamoAnuncie;
  const tipoLabel = TIPO_LABELS[item.tipo] || item.tipo;
  const documento = item.instruccionDocumento === "verificar";
  const vehiculos = item.vehiculos
    ?.map((vehicle) => vehicle.placa)
    .filter(Boolean)
    .join(",");

  const openVerification = () => {
    setCiInput("");
    setCiError("");
    setVerificationVisible(true);
  };

  const verifyIdentity = () => {
    if (!identificacion || ciInput.trim() !== identificacion) {
      setCiError("El número de identificación no coincide con el registrado");
      return;
    }
    onVerifyDocument?.();
    setVerificationVisible(false);
    setCiInput("");
    setCiError("");
  };

  const parseTime = (value?: string) => {
    const [hours = "0", minutes = "0"] = (value || "00:00").split(":");
    const date = new Date();
    date.setHours(Number(hours), Number(minutes), 0, 0);
    return date;
  };

  const handleTimeChange = (_event: DateTimePickerChangeEvent, date: Date) => {
    const picker = timePicker;
    setTimePicker(null);
    if (!date || !picker) return;
    const value = `${String(date.getHours()).padStart(2, "0")}:${String(
      date.getMinutes(),
    ).padStart(2, "0")}`;
    if (picker === "arrival") onUpdateArrivalTime?.(value);
    else onUpdateDepartureTime?.(value);
  };

  const selectPhotos = async (onSelected?: (photos: string[]) => void) => {
    if (!onSelected) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
    });
    if (!result.canceled) {
      onSelected(result.assets.map((asset) => asset.uri));
    }
  };

  return (
    <View className="gap-3.5">
      <View className="flex-row items-center gap-2.5">
        <View
          className="w-10 h-10 rounded-full items-center justify-center"
          style={{ backgroundColor: "#F3F4F6" }}
        >
          <Text style={{ fontSize: 21 }}>👤</Text>
        </View>
        <View className="flex-1">
          <Text className="text-base font-bold text-gray-900">
            {nombrePersona}
          </Text>
          <Text className="text-sm text-gray-500">
            {item.torre} - {item.depto} · {tipoLabel}
          </Text>
        </View>
      </View>

      <Text className="text-xs text-gray-400">
        📅 {item.fechaDesde}
        {item.fechaHasta ? ` a ${item.fechaHasta}` : ""}
      </Text>

      <View className="flex-row flex-wrap gap-1.5">
        {item.instruccionDocumento && (
          <InfoChip
            label={documento ? "🪪 Verificar" : "🔓 No verificar"}
            background={documento ? "#FEF3C7" : "#DBEAFE"}
            color={documento ? "#92400E" : "#1E40AF"}
          />
        )}
        {item.tipoNotificacion && (
          <InfoChip
            label={
              item.tipoNotificacion === "notificar-y-anunciar"
                ? "🔔 Anunciar"
                : "🔔 Notificar"
            }
          />
        )}
        <InfoChip
          label={
            item.tieneVehiculo
              ? `🚗 Con vehículo${vehiculos ? ` (${vehiculos})` : ""}`
              : "🚗 Sin vehículo"
          }
        />
        {lugaresDisponibles > 0 && (
          <InfoChip
            label={`🅿️ ${lugaresDisponibles} libres`}
            background="#F0FDF4"
            color="#166534"
          />
        )}
      </View>

      <View
        className="gap-2 py-2"
        style={{ borderTopWidth: 1, borderTopColor: "#F3F4F6" }}
      >
        {item.tipo === "temporal" &&
          (ciVerificado ? (
            <Text className="text-xs font-semibold text-green-700">
              ✓ Cédula verificada
            </Text>
          ) : (
            <Pressable
              onPress={openVerification}
              className="rounded-full px-3 py-2 items-center"
              style={{ backgroundColor: "#FEF3C7" }}
            >
              <Text className="text-xs font-semibold text-amber-800">
                🪪 Verificar cédula
              </Text>
            </Pressable>
          ))}
        <Pressable
          onPress={onToggleInstruction}
          className="flex-row items-center gap-2 py-1"
        >
          <CheckBox checked={instruccionCumplida} />
          <Text className="text-xs text-gray-500">Llamé / No lo anuncié</Text>
        </Pressable>
      </View>

      <View
        className="gap-2 py-2"
        style={{ borderTopWidth: 1, borderTopColor: "#F3F4F6" }}
      >
        <View className="flex-row flex-wrap items-center gap-3 py-1">
          <Toggle
            value={Boolean(llego)}
            onChange={(value) => onToggleArrival?.(value)}
          />
          <Text className="text-sm text-gray-500">
            {llego ? "Llegó" : "No llegó"}
          </Text>
          {item.tipo !== "huesped-temporal" &&
            item.tipo !== "temporal" &&
            identificacion &&
            !llego && (
              <Pressable onPress={openVerification}>
                <Text className="text-xs text-primary underline">
                  Verificar
                </Text>
              </Pressable>
            )}
        </View>

        <View className="flex-row flex-wrap items-center gap-2 py-1">
          <Text className="text-sm text-gray-500">Ingreso</Text>
          <Pressable
            onPress={() => setTimePicker("arrival")}
            className="rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1.5 w-[100px]"
          >
            <Text className="text-sm text-gray-900">
              {horaIngreso || "--:--"}
            </Text>
          </Pressable>
          {timePicker === "arrival" && (
            <DateTimePicker
              value={parseTime(horaIngreso)}
              mode="time"
              is24Hour
              display="default"
              onValueChange={handleTimeChange}
              onDismiss={() => setTimePicker(null)}
            />
          )}
          <Text className="text-sm text-gray-500">Salida</Text>
          <Pressable
            onPress={() => setTimePicker("departure")}
            className="rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1.5 w-[100px]"
          >
            <Text className="text-sm text-gray-900">
              {horaSalida || "--:--"}
            </Text>
          </Pressable>
          {timePicker === "departure" && (
            <DateTimePicker
              value={parseTime(horaSalida)}
              mode="time"
              is24Hour
              display="default"
              onValueChange={handleTimeChange}
              onDismiss={() => setTimePicker(null)}
            />
          )}
        </View>
      </View>

      <View
        className="gap-2 py-2"
        style={{ borderTopWidth: 1, borderTopColor: "#F3F4F6" }}
      >
        <NoteField
          label="Anotaciones de ingreso"
          value={item.anotacionesIngreso}
          placeholder="Observaciones al recibir al profesional"
          onChangeText={onUpdateEntryNotes}
        />
        <PhotoPicker
          photos={item.fotosIngreso}
          onPress={() => selectPhotos(onAddEntryPhotos)}
        />
        <NoteField
          label="Anotaciones de salida"
          value={item.anotacionesSalida}
          placeholder="Observaciones al retirarse el profesional"
          onChangeText={onUpdateExitNotes}
        />
        <PhotoPicker
          photos={item.fotosSalida}
          onPress={() => selectPhotos(onAddExitPhotos)}
        />
      </View>

      <Pressable
        onPress={() => onToggleDeparture?.(!Boolean(horaSalida))}
        className="flex-row items-center gap-2 py-1"
      >
        <CheckBox checked={Boolean(horaSalida)} />
        <Text className="text-xs text-gray-500">
          {horaSalida ? `Salida registrada ${horaSalida}` : "Registrar salida"}
        </Text>
      </Pressable>

      <View
        className="flex-row flex-wrap gap-2 pt-2"
        style={{ borderTopWidth: 1, borderTopColor: "#F3F4F6" }}
      >
        <View className="flex-1">
          <Button variant="secondary" onPress={onRegisterExit || (() => {})}>
            <Text>🚪 {horaSalida ? `Salió ${horaSalida}` : "Salió"}</Text>
          </Button>
        </View>
        <View className="flex-1">
          <Button variant="secondary" onPress={onAssignParking || (() => {})}>
            <Text>🅿️ Asignar estacionamiento</Text>
          </Button>
        </View>
        {item.tipoNotificacion === "notificar-y-anunciar" && (
          <View className="w-full">
            <Button variant="primary" onPress={onCallAnnounce || (() => {})}>
              <Text>📞 Llamar / Anunciar</Text>
            </Button>
          </View>
        )}
      </View>

      <Modal
        visible={verificationVisible}
        onClose={() => setVerificationVisible(false)}
        title="Verificar identidad"
      >
        <View className="items-center gap-4">
          <Text style={{ fontSize: 36 }}>🪪</Text>
          <Text className="text-base text-gray-900 text-center leading-6">
            Ingrese el número de identificación de{" "}
            <Text className="font-bold">{nombrePersona}</Text>
          </Text>
          <TextInput
            value={ciInput}
            onChangeText={(value) => {
              setCiInput(value);
              setCiError("");
            }}
            placeholder="Número de identificación"
            placeholderTextColor="#9CA3AF"
            keyboardType="numeric"
            autoFocus
            className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-3 text-base text-gray-900 text-center"
          />
          {!!ciError && (
            <Text className="text-xs text-red-600 text-center">{ciError}</Text>
          )}
          <View className="flex-row gap-3 w-full">
            <View className="flex-1">
              <Button
                variant="secondary"
                fullWidth
                onPress={() => setVerificationVisible(false)}
              >
                <Text>Cancelar</Text>
              </Button>
            </View>
            <View className="flex-1">
              <Button variant="primary" fullWidth onPress={verifyIdentity}>
                <Text>Verificar</Text>
              </Button>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function CheckBox({ checked }: { checked: boolean }) {
  return (
    <View
      className="h-[18px] w-[18px] rounded"
      style={{
        borderWidth: 2,
        borderColor: checked ? "#16A34A" : "#D1D5DB",
        backgroundColor: checked ? "#16A34A" : "transparent",
      }}
    >
      {checked && (
        <Text className="text-[11px] font-bold text-white text-center leading-4">
          ✓
        </Text>
      )}
    </View>
  );
}

function PhotoPicker({
  photos = [],
  onPress,
}: {
  photos?: string[];
  onPress: () => void;
}) {
  return (
    <View className="gap-2">
      <Pressable
        onPress={onPress}
        className="self-start rounded-lg border border-gray-200 bg-gray-50 px-3 py-2"
      >
        <Text className="text-xs font-semibold text-gray-600">
          Seleccionar archivos
        </Text>
      </Pressable>
      {photos.length > 0 && (
        <View className="flex-row flex-wrap gap-2">
          {photos.map((photo, index) => (
            <Image
              key={`${photo}-${index}`}
              source={{ uri: photo }}
              className="w-16 h-16 rounded-lg"
              resizeMode="cover"
            />
          ))}
        </View>
      )}
    </View>
  );
}

function NoteField({
  label,
  value,
  placeholder,
  onChangeText,
}: {
  label: string;
  value?: string;
  placeholder: string;
  onChangeText?: (value: string) => void;
}) {
  return (
    <View className="gap-1">
      <Text className="text-xs font-semibold text-gray-600">{label}</Text>
      <TextInput
        value={value || ""}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#9CA3AF"
        multiline
        numberOfLines={2}
        className="rounded-xl border border-gray-200 bg-gray-50 px-2.5 py-2 text-xs text-gray-900 min-h-[58px]"
        textAlignVertical="top"
      />
    </View>
  );
}

function InfoChip({
  label,
  background = "#F3F4F6",
  color = "#6B7280",
}: {
  label: string;
  background?: string;
  color?: string;
}) {
  return (
    <View
      className="rounded-full px-2 py-0.5"
      style={{ backgroundColor: background }}
    >
      <Text className="text-[11px]" style={{ color }}>
        {label}
      </Text>
    </View>
  );
}
