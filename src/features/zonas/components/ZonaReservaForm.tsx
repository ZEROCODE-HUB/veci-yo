import React from "react";
import { Text, View } from "react-native";
import { Controller } from "react-hook-form";
import { Button, Calendar, Input, Select, Toggle } from "@/shared/components";
import type { ZonaComun } from "@/shared/types";
import { useZonaReservaForm } from "../hooks";
import { ZonaBanner } from "./ZonaBanner";

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
    maxDuration,
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
  const fields = {
    numero: ["bbq", "coworking", "tenis", "lavanderia"].includes(zona.id),
    personas: !["gym", "lavanderia"].includes(zona.id),
  };

  const handleSubmit = () => {
    submit();
  };

  return (
    <View className="p-4 gap-3.5">
      <ZonaBanner zona={zona} />
      <SelectField
        control={control}
        name="hora"
        label="Seleccione hora de reserva:"
        options={opcionesHora}
      />
      <SelectField
        control={control}
        name="duracion"
        label={`Duracion (max ${maxDuration} ${maxDuration === 1 ? "hora" : "horas"}):`}
        options={durations}
      />
      {fields.numero && (
        <SelectField
          control={control}
          name="numero"
          label={`Seleccione N° de ${zona.nombre}:`}
          options={numbers}
        />
      )}
      <Controller
        control={control}
        name="fecha"
        render={({ field: { value, onChange } }) => (
          <Calendar selected={value} onSelect={onChange} />
        )}
      />
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
      <View className="flex-row flex-wrap gap-2">
        <Text className="rounded-full px-3.5 py-2 text-sm text-gray-500 border border-gray-200">
          Costo: $5 USD por persona
        </Text>
        <Text className="rounded-full px-3.5 py-2 text-sm text-gray-500 border border-gray-200">
          Garantia: $100 USD
        </Text>
      </View>
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
