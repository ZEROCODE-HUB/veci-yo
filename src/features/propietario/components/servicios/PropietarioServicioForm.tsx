import { Text, View } from "react-native";
import {
  Controller,
  type Control,
  type FieldErrors,
  type UseFormSetValue,
  type UseFormWatch,
} from "react-hook-form";
import { Button, CampoTelefono, Input } from "@/shared/components";
import type { AgregarServicioFormData } from "../../schemas/agregar-servicio.schema";

/**
 * El alta de un servicio contratado: luz, agua, internet.
 *
 * Los campos llevaban su texto **dentro**, como marcador de ejemplo, y ninguno
 * tenía etiqueta: al escribir, el campo se quedaba sin decir qué era. Con
 * nueve campos seguidos eso es imposible de revisar, y «Primer Aviso» a secas
 * no se entiende ni estando vacío.
 *
 * Ahora cada uno lleva etiqueta, y los dos avisos dicen lo que son: **el día
 * del mes en que vence**, decidido con el cliente el 06/10/2026.
 */
export function PropietarioServicioForm({
  control,
  errors,
  watch,
  setValue,
  onSubmit,
  guardando = false,
}: {
  control: Control<AgregarServicioFormData>;
  errors: FieldErrors<AgregarServicioFormData>;
  watch: UseFormWatch<AgregarServicioFormData>;
  setValue: UseFormSetValue<AgregarServicioFormData>;
  onSubmit: () => void;
  guardando?: boolean;
}) {
  return (
    <>
      <Controller
        control={control}
        name="nombreServicio"
        render={({ field }) => (
          <Input
            label="Servicio *"
            value={field.value || ""}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            placeholder="Luz, agua, internet…"
            error={errors.nombreServicio?.message}
          />
        )}
      />
      <Controller
        control={control}
        name="nombreEmpresa"
        render={({ field, fieldState }) => (
          <Input
            label="Empresa (opcional)"
            value={field.value || ""}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            placeholder="Quién presta el servicio"
            error={fieldState.error?.message}
          />
        )}
      />
      <View className="flex-row gap-2.5">
        <View className="flex-1">
          <Controller
            control={control}
            name="numeroCliente"
            render={({ field, fieldState }) => (
              <Input
                label="N.º de cliente (opcional)"
                value={field.value || ""}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={fieldState.error?.message}
              />
            )}
          />
        </View>
        <View className="flex-1">
          <Controller
            control={control}
            name="numeroMedidor"
            render={({ field, fieldState }) => (
              <Input
                label="N.º de medidor (opcional)"
                value={field.value || ""}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={fieldState.error?.message}
              />
            )}
          />
        </View>
      </View>
      {/*
        El día del mes, no una fecha: el servicio se repite todos los meses y
        una fecha concreta caduca en cuanto pasa. Decisión del cliente.
      */}
      <View className="flex-row gap-2.5">
        <View className="flex-1">
          <Controller
            control={control}
            name="primerAviso"
            render={({ field }) => (
              <Input
                label="Primer aviso (opcional)"
                explicacion="El día del mes, del 1 al 31, en que llega el recordatorio de este servicio."
                value={field.value || ""}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                placeholder="Día: 10"
                soloCifras
                error={errors.primerAviso?.message}
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
                label="Segundo aviso (opcional)"
                explicacion="Otro día del mes, del 1 al 31, para un segundo recordatorio."
                value={field.value || ""}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                placeholder="Día: 25"
                soloCifras
                error={errors.segundoAviso?.message}
              />
            )}
          />
        </View>
      </View>
      {/* A quién le llega, que no se decía (hueco 12). */}
      <Text className="text-xs text-gray-500">
        Esos días les llega un recordatorio a quienes viven en la vivienda.
      </Text>
      <Controller
        control={control}
        name="correoFactura"
        render={({ field }) => (
          <Input
            label="Correo para la factura (opcional)"
            value={field.value || ""}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            placeholder="correo@ejemplo.com"
            type="email"
            error={errors.correoFactura?.message}
          />
        )}
      />
      {/*
        Con su país, como el resto de los teléfonos del producto. Antes eran
        dos cajas sueltas --«Código Area» y «Numero de telefono»-- y de ahí
        salía un número que no se puede marcar desde fuera.
      */}
      <CampoTelefono
        label="Teléfono de atención (opcional)"
        error={errors.numeroTelefono?.message ?? errors.codigoPais?.message}
        codigoPais={watch("codigoPais") ?? ""}
        onCodigoPaisChange={(codigo) =>
          setValue("codigoPais", codigo, { shouldValidate: true })
        }
        telefono={watch("numeroTelefono") ?? ""}
        onTelefonoChange={(numero) =>
          setValue("numeroTelefono", numero, { shouldValidate: true })
        }
        ayuda="El de la empresa, para llamar cuando algo falla."
      />
      <View className="h-3" />
      <Button variant="primary" loading={guardando} onPress={onSubmit}>
        Agregar servicio
      </Button>
      <View className="h-6" />
    </>
  );
}
