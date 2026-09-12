import { View } from "react-native";
import { Controller, type Control, type FieldErrors } from "react-hook-form";
import { Button, Input } from "@/shared/components";
import type { AgregarServicioFormData } from "../../schemas/agregar-servicio.schema";

export function PropietarioServicioForm({
  control,
  errors,
  onSubmit,
}: {
  control: Control<AgregarServicioFormData>;
  errors: FieldErrors<AgregarServicioFormData>;
  onSubmit: () => void;
}) {
  return (
    <>
      <Controller
        control={control}
        name="nombreServicio"
        render={({ field }) => (
          <Input
            value={field.value || ""}
            onChangeText={field.onChange}
            placeholder="Nombre del servicio"
            error={errors.nombreServicio?.message}
          />
        )}
      />
      <Controller
        control={control}
        name="nombreEmpresa"
        render={({ field }) => (
          <Input
            value={field.value || ""}
            onChangeText={field.onChange}
            placeholder="Nombre de la empresa del servicio"
          />
        )}
      />
      <Controller
        control={control}
        name="numeroCliente"
        render={({ field }) => (
          <Input
            value={field.value || ""}
            onChangeText={field.onChange}
            placeholder="Numero de cliente"
          />
        )}
      />
      <Controller
        control={control}
        name="numeroMedidor"
        render={({ field }) => (
          <Input
            value={field.value || ""}
            onChangeText={field.onChange}
            placeholder="Numero de medidor"
          />
        )}
      />
      <View className="flex-row gap-2.5">
        <View className="flex-1">
          <Controller
            control={control}
            name="primerAviso"
            render={({ field }) => (
              <Input
                value={field.value || ""}
                onChangeText={field.onChange}
                placeholder="Primer Aviso"
              />
            )}
          />
        </View>
        <View className="flex-1">
          <Controller
            control={control}
            name="segundoAviso"
            render={({ field }) => (
              <Input
                value={field.value || ""}
                onChangeText={field.onChange}
                placeholder="Segundo Aviso"
              />
            )}
          />
        </View>
      </View>
      <Controller
        control={control}
        name="correoFactura"
        render={({ field }) => (
          <Input
            value={field.value || ""}
            onChangeText={field.onChange}
            placeholder="Correo de copia de envió de factura"
            type="email"
            error={errors.correoFactura?.message}
          />
        )}
      />
      <View className="flex-row gap-2.5">
        <View className="flex-1">
          <Controller
            control={control}
            name="codigoArea"
            render={({ field }) => (
              <Input
                value={field.value || ""}
                onChangeText={field.onChange}
                placeholder="Código Area"
              />
            )}
          />
        </View>
        <View className="flex-1">
          <Controller
            control={control}
            name="numeroTelefono"
            render={({ field }) => (
              <Input
                value={field.value || ""}
                onChangeText={field.onChange}
                placeholder="Numero de telefono"
              />
            )}
          />
        </View>
      </View>
      <View className="h-3" />
      <Button variant="primary" onPress={onSubmit}>
        Agregar servicio
      </Button>
      <View className="h-6" />
    </>
  );
}
