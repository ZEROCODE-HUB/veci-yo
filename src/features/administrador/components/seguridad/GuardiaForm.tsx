import { theme } from "@/config";
import { useEffect, useState } from "react";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, ScrollView, Text, View } from "react-native";
import { Button, Input, Select, Toggle } from "@/shared/components";
import type { Guardia } from "@/shared/types";
import { formatRangoHoras } from "@/shared/utils";
import { PageHeader as LayoutPageHeader } from "@/shared/layouts";
import { guardiaSchemaPara } from "../../schemas";
import {
  franjaDeEtiqueta,
  hourRanges,
  weekDays,
  type GuardiaFormValues,
} from "../../types";

type Props = {
  editing: Guardia | null;
  initial: GuardiaFormValues;
  porterias: { nombre: string }[];
  /** Mientras la invitación se emite: el botón espera. */
  guardando?: boolean;
  onBack: () => void;
  onSubmit: (data: GuardiaFormValues) => void;
};

export function GuardiaForm({
  editing,
  initial,
  porterias,
  guardando = false,
  onBack,
  onSubmit,
}: Props) {
  const esAlta = !editing;
  const [validationError, setValidationError] = useState("");
  const { control, handleSubmit, reset } = useForm<GuardiaFormValues>({
    resolver: zodResolver(guardiaSchemaPara(esAlta)),
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
        {esAlta && (
          <View className="rounded-2xl bg-white p-4">
            <Text className="text-sm leading-5 text-gray-500">
              El guardia recibe una invitación para crear su cuenta. Sus turnos
              se configuran cuando la acepte, desde «Gestionar turnos».
            </Text>
          </View>
        )}
        <View className="rounded-2xl bg-white p-4 gap-4">
          {/*
            El nombre y el correo son de la persona: se escriben al invitarla
            y después no se cambian desde aquí. Al editar se pedía un correo
            que la administración no ve y que luego se tiraba.
          */}
          {esAlta ? (
            <>
              <Controller
                control={control}
                name="nombre"
                render={({ field, fieldState }) => (
                  <Input
                    label="Nombre completo *"
                    soloLetras
                    placeholder="Nombre y apellido"
                    value={field.value}
                    onChangeText={field.onChange}
                    error={fieldState.error?.message}
                  />
                )}
              />
              <Controller
                control={control}
                name="correo"
                render={({ field, fieldState }) => (
                  <Input
                    label="Correo *"
                    placeholder="correo@ejemplo.com"
                    type="email"
                    value={field.value}
                    onChangeText={field.onChange}
                    error={fieldState.error?.message}
                  />
                )}
              />
            </>
          ) : (
            <View>
              <Text className="text-xs text-gray-500">Guardia</Text>
              <Text className="text-base font-bold text-gray-900">
                {editing.nombre}
              </Text>
            </View>
          )}
          <Controller
            control={control}
            name="cedula"
            render={({ field, fieldState }) => (
              <Input
                label="Cédula"
                placeholder="N° de identificación"
                value={field.value}
                onChangeText={field.onChange}
              error={fieldState.error?.message}
              />
            )}
          />
        </View>

        {!esAlta && (
        <View className="rounded-2xl bg-white p-4 gap-3">
          <View className="flex-row items-center justify-between">
            <Text className="text-base font-bold text-gray-900">
              Día y hora de la semana
            </Text>
            <Pressable
              accessibilityLabel="Agregar un dia y hora"
              onPress={() => append({ dia: "", horaInicio: "", horaFin: "" })}
              className="p-1"
            >
              <Ionicons name="add-circle-outline" size={25} color={theme.colors.primary} />
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
                {/*
                  El selector ofrece las cuatro franjas como siempre, pero lo
                  que se guarda son las dos horas: antes guardaba la etiqueta y
                  habia que volver a partirla para saber si el guardia estaba
                  trabajando.
                */}
                <Controller
                  control={control}
                  name={`turnos.${index}`}
                  render={({ field: controllerField }) => (
                    <Select
                      label={index === 0 ? "Hora" : undefined}
                      placeholder="Seleccionar"
                      value={formatRangoHoras(
                        controllerField.value?.horaInicio ?? "",
                        controllerField.value?.horaFin ?? "",
                      )}
                      options={hourRanges}
                      onChange={(etiqueta) => {
                        const franja = franjaDeEtiqueta(String(etiqueta));
                        if (!franja) return;
                        controllerField.onChange({
                          ...controllerField.value,
                          horaInicio: franja.horaInicio,
                          horaFin: franja.horaFin,
                        });
                      }}
                    />
                  )}
                />
              </View>
              {fields.length > 1 && (
                <Pressable
                  hitSlop={10}
                  accessibilityLabel="Quitar este dia y hora"
                  onPress={() => remove(index)}
                  className="p-3"
                >
                  <Ionicons
                    name="close-circle-outline"
                    size={21}
                    color={theme.colors.danger}
                  />
                </Pressable>
              )}
            </View>
          ))}
        </View>
        )}

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
                <Text className="shrink text-sm text-gray-700">Acceso a Chat</Text>
                <Toggle value={field.value ?? true} onChange={field.onChange} />
              </View>
            )}
          />
          <Controller
            control={control}
            name="permisoLlamadas"
            render={({ field }) => (
              <View className="flex-row items-center justify-between">
                <Text className="shrink text-sm text-gray-700">Acceso a Llamadas</Text>
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
          loading={guardando}
          onPress={() =>
            void handleSubmit(submit, (errores) =>
              // El motivo de verdad, no una frase fija que pedía lo que no faltaba.
              setValidationError(
                (errores.turnos?.message as string | undefined) ??
                  (errores.turnos?.root?.message as string | undefined) ??
                  "Revisa los campos marcados.",
              ),
            )()
          }
        >
          {editing ? "Continuar" : "Invitar guardia"}
        </Button>
      </ScrollView>
    </View>
  );
}
