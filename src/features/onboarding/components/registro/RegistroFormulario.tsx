import { View, Text, Pressable } from "react-native";
import { Controller } from "react-hook-form";
import { Button, Input, Select, Checkbox } from "@/shared/components";
import { useRegistro } from "../../hooks/useRegistro";

const TIPOS_DOCUMENTO = ["Cédula", "Pasaporte", "DNI"];
const MOTIVOS_ALOJAMIENTO = [
  "Turismo",
  "Trabajo",
  "Estudio",
  "Salud",
  "Visita familiar",
  "Otro",
];

interface RegistroFormularioProps {
  onAbrirTerminos: () => void;
}

export function RegistroFormulario({
  onAbrirTerminos,
}: RegistroFormularioProps) {
  const {
    control,
    handleSubmit,
    watch,
    formState: { errors },
    terminosAceptados,
    terminosError,
    setTerminosAceptados,
    setTerminosError,
    onSubmit,
  } = useRegistro();
  const tipoDocumento = watch("tipoDocumento");

  return (
    <View className="gap-3.5">
      <Controller
        control={control}
        name="nombre"
        render={({ field: { onChange, value } }) => (
          <Input
            label="Nombre/s"
            value={value}
            onChangeText={onChange}
            placeholder="Ej: María José"
            error={errors.nombre?.message}
            showEditIcon={false}
          />
        )}
      />
      <Controller
        control={control}
        name="apellido"
        render={({ field: { onChange, value } }) => (
          <Input
            label="Apellido/s"
            value={value}
            onChangeText={onChange}
            placeholder="Ej: Rodríguez Paz"
            error={errors.apellido?.message}
            showEditIcon={false}
          />
        )}
      />
      <Controller
        control={control}
        name="correo"
        render={({ field: { onChange, value } }) => (
          <Input
            label="Correo"
            value={value}
            onChangeText={onChange}
            placeholder="tu@correo.com"
            type="email"
            error={errors.correo?.message}
            showEditIcon={false}
          />
        )}
      />

      <View className="flex-row gap-2.5">
        <View className="flex-1">
          <Controller
            control={control}
            name="codArea"
            render={({ field: { onChange, value } }) => (
              <Input
                label="Cód. Área"
                value={value}
                onChangeText={onChange}
                placeholder="+593"
                error={errors.codArea?.message}
                showEditIcon={false}
              />
            )}
          />
        </View>
        <View className="flex-[2]">
          <Controller
            control={control}
            name="telefono"
            render={({ field: { onChange, value } }) => (
              <Input
                label="Número de teléfono"
                value={value}
                onChangeText={onChange}
                placeholder="987 654 321"
                type="numeric"
                error={errors.telefono?.message}
                showEditIcon={false}
              />
            )}
          />
        </View>
      </View>

      <View className="flex-row gap-2.5 items-start">
        <View className="flex-1">
          <Text className="text-sm text-gray-500 font-medium mb-1.5">Tipo</Text>
          <Controller
            control={control}
            name="tipoDocumento"
            render={({ field: { onChange, value } }) => (
              <Select
                value={value}
                options={TIPOS_DOCUMENTO}
                onChange={onChange}
                placeholder="Seleccionar"
              />
            )}
          />
          {errors.tipoDocumento && (
            <Text className="text-xs text-danger mt-1.5 font-medium">
              {errors.tipoDocumento.message}
            </Text>
          )}
        </View>
        <View className="flex-[1.4]">
          <Controller
            control={control}
            name="identificacion"
            render={({ field: { onChange, value } }) => (
              <Input
                label="Identificación"
                value={value}
                onChangeText={onChange}
                placeholder="N° de documento"
                error={errors.identificacion?.message}
                showEditIcon={false}
              />
            )}
          />
        </View>
      </View>

      {tipoDocumento === "Pasaporte" && (
        <Controller
          control={control}
          name="fechaUltimoIngreso"
          render={({ field: { onChange, value } }) => (
            <Input
              label="Fecha de último ingreso al país"
              value={value || ""}
              onChangeText={onChange}
              placeholder="DD/MM/AAAA"
              error={errors.fechaUltimoIngreso?.message}
              showEditIcon={false}
            />
          )}
        />
      )}

      <Controller
        control={control}
        name="password"
        render={({ field: { onChange, value } }) => (
          <Input
            label="Contraseña"
            value={value}
            onChangeText={onChange}
            placeholder="Mínimo 6 caracteres"
            type="password"
            error={errors.password?.message}
            showEditIcon={false}
          />
        )}
      />
      <Controller
        control={control}
        name="confirmPassword"
        render={({ field: { onChange, value } }) => (
          <Input
            label="Repetir contraseña"
            value={value}
            onChangeText={onChange}
            placeholder="Repite tu contraseña"
            type="password"
            error={errors.confirmPassword?.message}
            showEditIcon={false}
          />
        )}
      />

      <View>
        <Text className="text-sm text-gray-500 font-medium mb-1.5">
          Motivo del alojamiento
        </Text>
        <Controller
          control={control}
          name="motivoAlojamiento"
          render={({ field: { onChange, value } }) => (
            <Select
              value={value || ""}
              options={MOTIVOS_ALOJAMIENTO}
              onChange={onChange}
              placeholder="Seleccionar motivo"
            />
          )}
        />
      </View>

      <View className="py-2">
        <View className="flex-row">
          <Checkbox
            checked={terminosAceptados}
            onChange={(value) => {
              setTerminosAceptados(value);
              setTerminosError(false);
            }}
            label="Acepto los "
            error={terminosError}
          />
          <Pressable onPress={onAbrirTerminos}>
            <Text className="text-sm text-secondary underline">
              términos y condiciones
            </Text>
          </Pressable>
        </View>
        {terminosError && (
          <Text className="text-xs text-danger mt-1.5 font-medium">
            Debe aceptar los términos para continuar
          </Text>
        )}
      </View>

      <Button onPress={handleSubmit(onSubmit)} disabled={!terminosAceptados}>
        Registrarse
      </Button>
    </View>
  );
}
