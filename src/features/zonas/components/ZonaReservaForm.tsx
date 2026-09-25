import { theme } from "@/config";
import React from "react";
import { Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Controller } from "react-hook-form";
import { formatAmount } from "@/shared/utils";
import { Button, Input, Select, Toggle } from "@/shared/components";
import type { ZonaComun } from "@/shared/types";
import { useZonaReservaForm } from "../hooks";
import { ZonaBanner } from "./ZonaBanner";
import { diaEnLetra } from "../services/tiraDeDias";

interface Props {
  zona: ZonaComun;
  rol: string | null;
  initialHour?: string;
  initialDate?: string;
  initialDepartment?: string;
  onSuccess: (result: {
    depto: string;
    hora: string;
    reservaNum: string;
  }) => void;
}

export function ZonaReservaForm({
  zona,
  rol,
  initialHour,
  initialDate,
  initialDepartment,
  onSuccess,
}: Props) {
  const {
    control,
    submit,
    errors,
    maxHoras,
    opcionesHora,
    durations,
    numbers,
    cantidadPersonas,
    participantTypes,
    hora,
    acceptTerms,
    asistentes,
  } = useZonaReservaForm({
    zona,
    rol,
    initialHour,
    initialDate,
    initialDepartment,
    onSuccess,
  });
  // Estos dos campos se decidian con una lista de ids literales
  // (["bbq","coworking","tenis","lavanderia"]). Con las zonas en la base el id
  // es un uuid, asi que la lista no acertaba nunca: se decide por como esta
  // configurada la zona.
  const zonaConfig = zona as typeof zona & {
    cuposSimultaneos?: number;
    capacidadMaxima?: number;
    costoReserva?: number;
    montoGarantia?: number;
    moneda?: string | null;
  };
  const fields = {
    // El numero de puesto solo tiene sentido si hay mas de uno que elegir.
    numero: (zonaConfig.total ?? 1) > 1,
    // Y los acompañantes, solo si la zona admite mas de una persona. Ojo:
    // `capacidad_maxima` es ambigua en el modelo -- en la lavanderia parece
    // contar maquinas y no personas --, asi que este criterio conviene
    // revisarlo con el cliente.
    personas: (zonaConfig.capacidadMaxima ?? 0) > 1,
  };

  const moneda = zonaConfig.moneda ?? "";
  const importes = [
    zonaConfig.costoReserva
      ? `Costo: ${formatAmount(zonaConfig.costoReserva)} ${moneda} por persona`
      : null,
    zonaConfig.montoGarantia
      ? `Garantía: ${formatAmount(zonaConfig.montoGarantia)} ${moneda}`
      : null,
  ].filter((texto): texto is string => !!texto);

  const handleSubmit = () => {
    submit();
  };

  return (
    <View className="p-4 gap-3.5">
      <ZonaBanner zona={zona} />
      {/*
        La hora y el dia se eligieron en la grilla, que es la unica puerta a
        este formulario. Se enseñan; no se vuelven a preguntar.

        Aqui habia dos desplegables. El de la hora repetia la pregunta que
        acababa de contestarse en la pantalla anterior. El de «Duración» era
        peor: **no se usaba al guardar**. La hora de fin sale del texto de la
        franja --«07:30 - 08:30»--, asi que elegir «2 horas» no cambiaba nada.
        Reservar menos de la franja no es algo que la app sepa hacer hoy; si
        se quiere, es trabajo nuevo y no un desplegable.
      */}
      <Controller
        control={control}
        name="fecha"
        render={({ field: { value } }) => (
          <View
            className="rounded-xl px-3 py-2.5 gap-1"
            style={{
              backgroundColor: theme.colors.bgMuted,
              borderWidth: 1,
              borderColor: theme.colors.border,
            }}
          >
            <View className="flex-row items-center gap-2">
              <Ionicons
                name="calendar-outline"
                size={16}
                color={theme.colors.textSecondary}
              />
              <Text className="text-sm text-gray-900">
                {diaEnLetra(value instanceof Date ? value : new Date())}
              </Text>
            </View>
            <View className="flex-row items-center gap-2">
              <Ionicons
                name="time-outline"
                size={16}
                color={theme.colors.textSecondary}
              />
              <Text className="text-sm font-semibold text-gray-900">
                {hora || "Sin hora"}
              </Text>
            </View>
          </View>
        )}
      />
      {fields.numero && (
        <SelectField
          control={control}
          name="numero"
          label={`Seleccione N° de ${zona.nombre}:`}
          options={numbers}
        />
      )}

      {fields.personas && (
        <SelectField
          control={control}
          name="peopleCount"
          label="Cantidad de personas que asistiran junto al titular:"
          options={cantidadPersonas}
        />
      )}
      {asistentes.length > 0 && (
        <View className="gap-2">
          <Text className="text-sm text-gray-500">
            Nombres de los asistentes (opcional - puedes agregarlos ahora o
            después editando la reserva)
          </Text>
          {asistentes.map((_, index) => (
            <View key={index} className="flex-row items-end gap-2">
              <View className="flex-1">
                <Controller
                  control={control}
                  name={`asistentes.${index}.nombre`}
                  render={({ field: { value, onChange } }) => (
                    <Input
                      value={value}
                      onChangeText={onChange}
                      placeholder={`Nombre del asistente ${index + 1}${index === 0 ? " (Titular)" : ""}`}
                    />
                  )}
                />
              </View>
              <View style={{ width: 150 }}>
                <Controller
                  control={control}
                  name={`asistentes.${index}.tipoParticipante`}
                  render={({ field: { value, onChange } }) => (
                    <Select
                      value={value}
                      options={[...participantTypes]}
                      onChange={onChange}
                    />
                  )}
                />
              </View>
            </View>
          ))}
        </View>
      )}
      <Controller
        control={control}
        name="comments"
        render={({ field: { value, onChange } }) => (
          <Input
            label="Comentarios u observaciones"
            value={value || ""}
            onChangeText={onChange}
            placeholder="Escriba sus comentarios aqui..."
            multiline
            rows={3}
          />
        )}
      />
      {/* Una zona gratuita no muestra importes en lugar de mostrar cero. */}
      {importes.length > 0 && (
        <View className="flex-row flex-wrap gap-2">
          {importes.map((texto) => (
            <Text
              key={texto}
              className="rounded-full px-3.5 py-2 text-sm text-gray-500 border border-gray-200"
            >
              {texto}
            </Text>
          ))}
        </View>
      )}
      <Controller
        control={control}
        name="depto"
        render={({ field: { value, onChange } }) => (
          <Input
            label="Departamento"
            value={value}
            onChangeText={onChange}
            error={errors.depto?.message}
          />
        )}
      />
      <Controller
        control={control}
        name="chargeMaintenance"
        render={({ field: { value, onChange } }) => (
          <Toggle
            value={value}
            onChange={onChange}
            labelRight="El costo se carga automaticamente a su cuota de mantenimiento"
          />
        )}
      />
      <Controller
        control={control}
        name="acceptTerms"
        render={({ field: { value, onChange } }) => (
          <Toggle
            value={value}
            onChange={onChange}
            labelRight="Acepta terminos y condiciones"
          />
        )}
      />
      {errors.acceptTerms && (
        <Text className="text-xs text-red-500">
          {errors.acceptTerms.message}
        </Text>
      )}
      <Button fullWidth onPress={handleSubmit} disabled={!hora || !acceptTerms}>
        Aceptar
      </Button>
    </View>
  );
}

function SelectField({
  control,
  name,
  label,
  options,
}: {
  control: any;
  name: string;
  label: string;
  options: string[];
}) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { value, onChange } }) => (
        <Select
          label={label}
          value={value || null}
          options={options}
          onChange={onChange}
        />
      )}
    />
  );
}
