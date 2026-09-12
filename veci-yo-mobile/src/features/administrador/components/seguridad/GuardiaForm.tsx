import { useEffect, useState } from "react";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, ScrollView, Text, View } from "react-native";
import { Button, Input, Select, Toggle } from "@/shared/components";
import type { Guardia } from "@/shared/types";
import { PageHeader as LayoutPageHeader } from "@/shared/layouts";
import { guardiaSchema } from "../../schemas";
import {
  calendarCities,
  hourRanges,
  weekDays,
  type GuardiaFormValues,
} from "../../types";

type Props = {
  editing: Guardia | null;
  initial: GuardiaFormValues;
  porterias: { nombre: string }[];
  onBack: () => void;
  onSubmit: (data: GuardiaFormValues) => void;
};

export function GuardiaForm({
  editing,
  initial,
  porterias,
  onBack,
  onSubmit,
}: Props) {
  const [validationError, setValidationError] = useState("");
  const { control, handleSubmit, reset } = useForm<GuardiaFormValues>({
    resolver: zodResolver(guardiaSchema),
    defaultValues: initial,
  });
  const { fields, append, remove } = useFieldArray({ control, name: "turnos" });

  useEffect(() => {
    reset(initial);
    setValidationError("");
  }, [initial, reset]);

  const submit = (data: GuardiaFormValues) => {
    setValidationError("");
    onSubmit(data);
  };

  return (
    <View className="flex-1 bg-bg-app">
      <LayoutPageHeader
        title={editing ? "Editar seguridad" : "Agregar seguridad"}
        onBack={onBack}
      />
      <ScrollView className="flex-1" contentContainerClassName="p-4 gap-4">
        <View className="rounded-2xl bg-white p-4 gap-4">
          <Controller
            control={control}
            name="nombre"
            render={({ field }) => (
              <Input
                label="Nombre completo *"
                placeholder="Ej: Roberto Hornado"
                value={field.value}
                onChangeText={field.onChange}
              />
            )}
          />
          <Controller
            control={control}
            name="correo"
            render={({ field }) => (
              <Input
                label="Correo *"
                placeholder="correo@ejemplo.com"
                type="email"
                value={field.value}
                onChangeText={field.onChange}
              />
            )}
          />
          <Controller
            control={control}
            name="cedula"
            render={({ field }) => (
              <Input
                label="Cédula"
                placeholder="N° de identificación"
                value={field.value}
                onChangeText={field.onChange}
              />
            )}
          />
          <Controller
            control={control}
            name="diasCalendario"
            render={({ field }) => (
              <Select
                label="Días del calendario"
                placeholder="Seleccionar"
                value={field.value}
                options={calendarCities}
                onChange={field.onChange}
              />
            )}
          />
        </View>

        <View className="rounded-2xl bg-white p-4 gap-3">
          <View className="flex-row items-center justify-between">
            <Text className="text-base font-bold text-gray-900">
              Día/hora de la semana *
            </Text>
            <Pressable
              onPress={() => append({ dia: "", hora: "" })}
              className="p-1"
            >
              <Ionicons name="add-circle-outline" size={25} color="#F5B800" />
            </Pressable>
          </View>
          {fields.map((field, index) => (
            <View key={field.id} className="flex-row items-end gap-2">
              <View className="flex-1">
                <Controller
                  control={control}
                  name={`turnos.${index}.dia`}
                  render={({ field: controllerField }) => (
                    <Select
                      label={index === 0 ? "Día" : undefined}
                      placeholder="Seleccionar"
                      value={controllerField.value}
                      options={weekDays}
                      onChange={controllerField.onChange}
                    />
                  )}
                />
              </View>
              <View className="flex-1">
                <Controller
                  control={control}
                  name={`turnos.${index}.hora`}
                  render={({ field: controllerField }) => (
                    <Select
                      label={index === 0 ? "Hora" : undefined}
                      placeholder="Seleccionar"
                      value={controllerField.value}
                      options={hourRanges}
                      onChange={controllerField.onChange}
                    />
                  )}
                />
              </View>
              {fields.length > 1 && (
                <Pressable onPress={() => remove(index)} className="p-3">
                  <Ionicons
                    name="close-circle-outline"
                    size={21}
                    color="#EF4444"
                  />
                </Pressable>
              )}
            </View>
          ))}
        </View>

        <View className="rounded-2xl bg-white p-4 gap-4">
          <Text className="text-base font-bold text-gray-900">
            Ubicación de puesto de seguridad
          </Text>
          <Controller
            control={control}
            name="garita"
            render={({ field }) => (
              <Select
                label="Garita"
                placeholder="Seleccionar"
                value={field.value}
                options={[
                  ...porterias.map((item) => item.nombre),
                  "Ubicación no fija / rotatorio",
                ]}
                onChange={field.onChange}
              />
            )}
          />
        </View>

        <View className="rounded-2xl bg-white p-4 gap-4">
          <Text className="text-base font-bold text-gray-900">
            Permisos de comunicación
          </Text>
          <Controller
            control={control}
            name="permisoChat"
            render={({ field }) => (
              <View className="flex-row items-center justify-between">
                <Text className="text-sm text-gray-700">Acceso a Chat</Text>
                <Toggle value={field.value ?? true} onChange={field.onChange} />
              </View>
            )}
          />
          <Controller
            control={control}
            name="permisoLlamadas"
            render={({ field }) => (
              <View className="flex-row items-center justify-between">
                <Text className="text-sm text-gray-700">Acceso a Llamadas</Text>
                <Toggle value={field.value ?? true} onChange={field.onChange} />
              </View>
            )}
          />
        </View>

        {!!validationError && (
          <Text className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
            {validationError}
          </Text>
        )}
        <Button
          fullWidth
          onPress={() =>
            void handleSubmit(submit, () =>
              setValidationError("Completa el nombre, correo y al menos un horario."),
            )()
          }
        >
          {editing ? "Continuar" : "Guardar guardia"}
        </Button>
      </ScrollView>
    </View>
  );
}
