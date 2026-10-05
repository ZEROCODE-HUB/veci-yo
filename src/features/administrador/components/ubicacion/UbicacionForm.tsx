import type React from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Input } from "@/shared/components";
import { AdminSectionCard } from "../AdminSectionCard";
import { Text, View } from "react-native";
import { ubicacionSchema } from "../../schemas/ubicacion.schema";
import type { UbicacionFormValues } from "../../types/ubicacion";

export function UbicacionForm({
  initialValues,
  onSubmit,
  guardando = false,
  ayuda,
}: {
  initialValues: UbicacionFormValues;
  onSubmit: (values: UbicacionFormValues) => void;
  /** Deshabilita el boton mientras el guardado esta en curso. */
  guardando?: boolean;
  /**
   * Nota de ayuda bajo el formulario. Se pasa desde fuera porque depende de
   * donde este montado: la pantalla suelta manda a Arquitectura, y dentro de
   * Arquitectura eso seria mandar a donde ya se esta.
   */
  ayuda?: React.ReactNode;
}) {
  const { control, handleSubmit } = useForm<UbicacionFormValues>({
    resolver: zodResolver(ubicacionSchema),
    defaultValues: initialValues,
  });
  const field = (name: keyof UbicacionFormValues, label: string, type?: "email") => (
    <Controller
      key={name}
      control={control}
      name={name}
      render={({ field: controllerField }) => (
        <Input
          label={label}
          value={controllerField.value}
          onChangeText={controllerField.onChange}
          type={type}
        />
      )}
    />
  );

  return (
    <View className="gap-4">
      <AdminSectionCard title="Información del condominio">
        {field("nombre", "Nombre del condominio")}
        {field("direccion", "Dirección")}
        <View className="flex-row gap-3">
          <View className="flex-1">{field("ciudad", "Ciudad")}</View>
          <View className="flex-1">{field("pais", "País")}</View>
        </View>
        {field("ruc", "RUC / Identificación fiscal")}
        <View className="flex-row gap-3">
          <View className="flex-1">{field("telefono", "Teléfono")}</View>
          <View className="flex-1">{field("email", "Correo electrónico", "email")}</View>
        </View>
        {/*
          `guardando` llegaba de las dos pantallas que usan este
          formulario y no se usaba: el boton no se bloqueaba mientras la
          escritura estaba en curso, asi que pulsarlo dos veces --que es
          lo que se hace cuando nada responde-- mandaba dos peticiones.
        */}
        <Button
          fullWidth
          loading={guardando}
          onPress={() => void handleSubmit(onSubmit)()}
        >
          Guardar configuración
        </Button>
      </AdminSectionCard>
      {Boolean(ayuda) && (
        <AdminSectionCard>
          <Text className="text-sm text-gray-700 text-center leading-6">
            {ayuda}
          </Text>
        </AdminSectionCard>
      )}
    </View>
  );
}
