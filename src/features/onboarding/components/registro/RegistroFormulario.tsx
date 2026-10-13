import { theme } from "@/config";
import { View, Text, Pressable } from "react-native";
import { Controller } from "react-hook-form";
import {
  Button,
  CampoTelefono,
  Checkbox,
  Input,
  Select,
} from "@/shared/components";
import { useRegistro } from "../../hooks/useRegistro";

const TIPOS_DOCUMENTO = ["Cédula", "Pasaporte", "DNI"];
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
    setValue,
    formState: { errors },
    terminosAceptados,
    terminosError,
    setTerminosAceptados,
    setTerminosError,
    onSubmit,
    registrando,
    correoPorConfirmar,
  } = useRegistro();

  /*
    La cuenta existe y falta confirmarla. Se dice aquí, en lugar del
    formulario: dejarlo a la vista invita a registrarse otra vez.
  */
  if (correoPorConfirmar) {
    return (
      <View
        className="gap-2 rounded-2xl p-4"
        style={{ backgroundColor: theme.colors.successLight }}
      >
        <Text className="text-base font-bold text-gray-900">
          Revisa tu correo
        </Text>
        <Text className="text-sm text-gray-700">
          Te enviamos un mensaje a {correoPorConfirmar}. Ábrelo y pulsa el
          enlace para confirmar tu cuenta; después podrás iniciar sesión.
        </Text>
        <Text className="text-xs text-gray-500">
          Si no llega en unos minutos, mira en la carpeta de correo no deseado.
        </Text>
      </View>
    );
  }

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

      <CampoTelefono
        label="Número de teléfono"
        codigoPais={watch("codigoPais")}
        onCodigoPaisChange={(codigo) =>
          setValue("codigoPais", codigo, { shouldValidate: true })
        }
        telefono={watch("telefono")}
        onTelefonoChange={(numero) =>
          setValue("telefono", numero, { shouldValidate: true })
        }
        placeholder="300 123 4567"
        error={errors.telefono?.message ?? errors.codigoPais?.message}
      />

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

      <Controller
        control={control}
        name="password"
        render={({ field: { onChange, value } }) => (
          <Input
            label="Contraseña"
            value={value}
            onChangeText={onChange}
            placeholder="Mínimo 8 caracteres"
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
            Tienes que aceptar los términos para continuar
          </Text>
        )}
      </View>

      <Button
        onPress={handleSubmit(onSubmit)}
        disabled={!terminosAceptados}
        loading={registrando}
      >
        Registrarse
      </Button>
    </View>
  );
}
