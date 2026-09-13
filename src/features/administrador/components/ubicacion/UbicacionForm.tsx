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
}: {
  initialValues: UbicacionFormValues;
  onSubmit: (values: UbicacionFormValues) => void;
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
      <AdminSectionCard title="Informacion del condominio">
        {field("nombre", "Nombre del condominio")}
        {field("direccion", "Direccion")}
        <View className="flex-row gap-3">
          <View className="flex-1">{field("ciudad", "Ciudad")}</View>
          <View className="flex-1">{field("pais", "Pais")}</View>
        </View>
        {field("ruc", "RUC / Identificacion fiscal")}
        <View className="flex-row gap-3">
          <View className="flex-1">{field("telefono", "Telefono")}</View>
          <View className="flex-1">{field("email", "Correo electronico", "email")}</View>
        </View>
        <Button fullWidth onPress={() => void handleSubmit(onSubmit)()}>
          Guardar configuracion
        </Button>
      </AdminSectionCard>
      <AdminSectionCard>
        <Text className="text-sm text-gray-700 text-center leading-6">
          Una vez configurado el condominio, ve a la seccion{" "}
          <Text className="font-bold">Arquitectura</Text> para registrar
          torres, bloques, pisos, unidades y asignar propietarios.
        </Text>
      </AdminSectionCard>
    </View>
  );
}
