import { Controller, useForm } from "react-hook-form";
import { View } from "react-native";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, ImageUploadCard, Input, Modal } from "@/shared/components";
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
        {/* Eran dos selectores con cinco distritos y cinco urbanizaciones de
            Lima, fijos. El producto opera tambien en Colombia, y ni siquiera
            en Peru esa lista es completa: quien vive en un distrito que no
            estaba no podia registrar su vivienda. Como el pais y la ciudad ya
            vienen del condominio, aqui basta el texto. */}
        <Controller
          control={control}
          name="distrito"
          render={({ field }) => (
            <Input
              label="Distrito / Localidad"
              value={field.value}
              onChangeText={field.onChange}
              placeholder="Ej. Chapinero, Miraflores"
            />
          )}
        />
        <Controller
          control={control}
          name="urbanizacion"
          render={({ field }) => (
            <Input
              label="Urbanización / Barrio"
              value={field.value}
              onChangeText={field.onChange}
              placeholder="Ej. El Chicó"
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
