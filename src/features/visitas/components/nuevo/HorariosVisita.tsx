import { theme } from "@/config";
import React from "react";
import { View, Text, Pressable } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import type { DateTimePickerChangeEvent } from "@react-native-community/datetimepicker";
import { Input } from "@/shared/components";

interface Props {
  esGuardia: boolean;
  tipoSeleccionado: string | null;
  horaInicio: string;
  setHoraInicio: (v: string) => void;
  horaFin: string;
  setHoraFin: (v: string) => void;
  horaSalidaInicio: string;
  setHoraSalidaInicio: (v: string) => void;
  horaSalidaFin: string;
  setHoraSalidaFin: (v: string) => void;
  showTimePicker: boolean;
  setShowTimePicker: (v: boolean) => void;
  showTimePickerFin: boolean;
  setShowTimePickerFin: (v: boolean) => void;
  showTimePickerSalidaInicio: boolean;
  setShowTimePickerSalidaInicio: (v: boolean) => void;
  showTimePickerSalidaFin: boolean;
  setShowTimePickerSalidaFin: (v: boolean) => void;
  horaIngresoDate: Date;
  setHoraIngresoDate: (v: Date) => void;
  horaFinDate: Date;
  setHoraFinDate: (v: Date) => void;
  horaSalidaInicioDate: Date;
  setHoraSalidaInicioDate: (v: Date) => void;
  horaSalidaFinDate: Date;
  setHoraSalidaFinDate: (v: Date) => void;
}

/**
 * Franja de llegada y, para el huesped temporal, tambien la de salida.
 *
 * Es la seccion mas larga del formulario: cuatro horas, cada una con su
 * selector nativo y su estado de apertura.
 */
export function HorariosVisita({
  esGuardia,
  tipoSeleccionado,
  horaInicio,
  setHoraInicio,
  horaFin,
  setHoraFin,
  horaSalidaInicio,
  setHoraSalidaInicio,
  horaSalidaFin,
  setHoraSalidaFin,
  showTimePicker,
  setShowTimePicker,
  showTimePickerFin,
  setShowTimePickerFin,
  showTimePickerSalidaInicio,
  setShowTimePickerSalidaInicio,
  showTimePickerSalidaFin,
  setShowTimePickerSalidaFin,
  horaIngresoDate,
  setHoraIngresoDate,
  horaFinDate,
  setHoraFinDate,
  horaSalidaInicioDate,
  setHoraSalidaInicioDate,
  horaSalidaFinDate,
  setHoraSalidaFinDate,
}: Props) {
  return (
    <>
{/* Time inputs */}
{esGuardia ? (
  <View
    className="rounded-2xl p-4 gap-3"
    style={{
      backgroundColor: theme.colors.bgMuted,
      boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
    }}
  >
    <Text className="text-sm text-gray-500">Hora de ingreso *</Text>
    <Pressable
      onPress={() => setShowTimePicker(true)}
      className="rounded-xl px-3 py-2.5"
      style={{
        backgroundColor: theme.colors.borderLight,
        borderWidth: 1,
        borderColor: theme.colors.border,
      }}
    >
      <Text className="text-sm text-gray-900">
        {horaInicio || "Seleccionar hora"}
      </Text>
    </Pressable>
    {showTimePicker && (
      <DateTimePicker
        value={horaIngresoDate}
        mode="time"
        is24Hour={true}
        display="default"
        onValueChange={(_event: DateTimePickerChangeEvent, date: Date) => {
          setShowTimePicker(false);
          if (date) {
            setHoraIngresoDate(date);
            const h = String(date.getHours()).padStart(2, "0");
            const m = String(date.getMinutes()).padStart(2, "0");
            setHoraInicio(`${h}:${m}`);
          }
        }}
        onDismiss={() => setShowTimePicker(false)}
      />
    )}
    <Text className="text-xs text-gray-400">
      La salida se registra posteriormente desde el detalle del
      ingreso.
    </Text>
  </View>
) : (
  <View
    className="rounded-2xl p-4 gap-3"
    style={{
      backgroundColor: theme.colors.bgMuted,
      boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
    }}
  >
    <Text className="text-sm text-gray-500">
      Hora estimada de llegada
    </Text>
    <View className="flex-row items-center gap-2">
      <View className="flex-1">
        <Pressable
          onPress={() => setShowTimePicker(true)}
          className="rounded-xl px-3 py-2.5"
          style={{
            backgroundColor: theme.colors.borderLight,
            borderWidth: 1,
            borderColor: theme.colors.border,
          }}
        >
          <Text className="text-sm text-gray-900">
            {horaInicio || "Desde"}
          </Text>
        </Pressable>
        {showTimePicker && (
          <DateTimePicker
            value={horaIngresoDate}
            mode="time"
            is24Hour={true}
            display="default"
            onValueChange={(_event: DateTimePickerChangeEvent, date: Date) => {
              setShowTimePicker(false);
              if (date) {
                setHoraIngresoDate(date);
                const h = String(date.getHours()).padStart(2, "0");
                const m = String(date.getMinutes()).padStart(2, "0");
                setHoraInicio(`${h}:${m}`);
              }
            }}
            onDismiss={() => setShowTimePicker(false)}
          />
        )}
      </View>
      <Text className="text-gray-400">a</Text>
      <View className="flex-1">
        <Pressable
          onPress={() => setShowTimePickerFin(true)}
          className="rounded-xl px-3 py-2.5"
          style={{
            backgroundColor: theme.colors.borderLight,
            borderWidth: 1,
            borderColor: theme.colors.border,
          }}
        >
          <Text className="text-sm text-gray-900">
            {horaFin || "Hasta"}
          </Text>
        </Pressable>
        {showTimePickerFin && (
          <DateTimePicker
            value={horaFinDate}
            mode="time"
            is24Hour={true}
            display="default"
            onValueChange={(_event: DateTimePickerChangeEvent, date: Date) => {
              setShowTimePickerFin(false);
              if (date) {
                setHoraFinDate(date);
                const h = String(date.getHours()).padStart(2, "0");
                const m = String(date.getMinutes()).padStart(2, "0");
                setHoraFin(`${h}:${m}`);
              }
            }}
            onDismiss={() => setShowTimePickerFin(false)}
          />
        )}
      </View>
    </View>
  </View>
)}

{/* HT: exit time */}
{!esGuardia && tipoSeleccionado === "huesped-temporal" && (
  <View
    className="rounded-2xl p-4 gap-3"
    style={{
      backgroundColor: theme.colors.bgMuted,
      boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
    }}
  >
    <Text className="text-sm text-gray-500">
      Hora estimada de salida
    </Text>
    <View className="flex-row items-center gap-2">
      <View className="flex-1">
        <Pressable
          onPress={() => setShowTimePickerSalidaInicio(true)}
          className="rounded-xl px-3 py-2.5"
          style={{
            backgroundColor: theme.colors.borderLight,
            borderWidth: 1,
            borderColor: theme.colors.border,
          }}
        >
          <Text className="text-sm text-gray-900">
            {horaSalidaInicio || "Desde"}
          </Text>
        </Pressable>
        {showTimePickerSalidaInicio && (
          <DateTimePicker
            value={horaSalidaInicioDate}
            mode="time"
            is24Hour={true}
            display="default"
            onValueChange={(_event: DateTimePickerChangeEvent, date: Date) => {
              setShowTimePickerSalidaInicio(false);
              if (date) {
                setHoraSalidaInicioDate(date);
                const h = String(date.getHours()).padStart(2, "0");
                const m = String(date.getMinutes()).padStart(2, "0");
                setHoraSalidaInicio(`${h}:${m}`);
              }
            }}
            onDismiss={() => setShowTimePickerSalidaInicio(false)}
          />
        )}
      </View>
      <Text className="text-gray-400">a</Text>
      <View className="flex-1">
        <Pressable
          onPress={() => setShowTimePickerSalidaFin(true)}
          className="rounded-xl px-3 py-2.5"
          style={{
            backgroundColor: theme.colors.borderLight,
            borderWidth: 1,
            borderColor: theme.colors.border,
          }}
        >
          <Text className="text-sm text-gray-900">
            {horaSalidaFin || "Hasta"}
          </Text>
        </Pressable>
        {showTimePickerSalidaFin && (
          <DateTimePicker
            value={horaSalidaFinDate}
            mode="time"
            is24Hour={true}
            display="default"
            onValueChange={(_event: DateTimePickerChangeEvent, date: Date) => {
              setShowTimePickerSalidaFin(false);
              if (date) {
                setHoraSalidaFinDate(date);
                const h = String(date.getHours()).padStart(2, "0");
                const m = String(date.getMinutes()).padStart(2, "0");
                setHoraSalidaFin(`${h}:${m}`);
              }
            }}
            onDismiss={() => setShowTimePickerSalidaFin(false)}
          />
        )}
      </View>
    </View>
  </View>
)}

    </>
  );
}
