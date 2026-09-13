import { Controller, useForm } from "react-hook-form";
import { View } from "react-native";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, ImageUploadCard, Input, Modal, Select } from "@/shared/components";
import { distritosUbicacion, urbanizacionesUbicacion } from "@/features/home/homeMockData";
import { ubicacionSchema, type UbicacionFormValues } from "../../schemas";
import type { UbicacionFormulario } from "../../types";

interface UbicacionFormModalProps {
  visible: boolean;
  title: string;
  submitLabel: string;
  initialValues: UbicacionFormulario;
  onClose: () => void;
  onSubmit: (values: UbicacionFormulario) => void;
}

export function UbicacionFormModal({
  visible,
  title,
  submitLabel,
  initialValues,
  onClose,
  onSubmit,
}: UbicacionFormModalProps) {
  const { control, handleSubmit } = useForm<UbicacionFormValues>({
    resolver: zodResolver(ubicacionSchema),
    defaultValues: initialValues,
  });

  return (
    <Modal visible={visible} onClose={onClose} title={title}>
      <View className="gap-3.5">
        <Controller
          control={control}
          name="distrito"
          render={({ field }) => (
            <Select
              label="Distrito"
              value={field.value}
              options={distritosUbicacion}
              onChange={(value) => field.onChange(String(value))}
              placeholder="Seleccione distrito"
            />
          )}
        />
        <Controller
          control={control}
          name="urbanizacion"
          render={({ field }) => (
            <Select
              label="Urbanización"
              value={field.value}
              options={urbanizacionesUbicacion}
              onChange={(value) => field.onChange(String(value))}
              placeholder="Seleccione urbanización"
            />
          )}
        />
        <Controller
          control={control}
          name="condominio"
          render={({ field }) => (
            <Input
              label="Condominio"
              value={field.value}
              onChangeText={field.onChange}
              placeholder="Nombre del condominio"
            />
          )}
        />
        <Controller
          control={control}
          name="correoAdm"
          render={({ field }) => (
            <Input
              label="Correo ADM"
              value={field.value}
              onChangeText={field.onChange}
              placeholder="Correo ADM condominio"
            />
          )}
        />
        <Controller
          control={control}
          name="imagen"
          render={({ field }) => (
            <ImageUploadCard
              label="Imagen representativa"
              value={field.value}
              onChange={field.onChange}
              height={120}
              placeholder="Subir imagen del edificio"
            />
          )}
        />
        <Button variant="primary" onPress={handleSubmit(onSubmit)}>
          {submitLabel}
        </Button>
      </View>
    </Modal>
  );
}
