import { theme } from "@/config";
import { View, Text } from "react-native";
import { Controller, type Control, type FieldErrors } from "react-hook-form";
import { Button, Checkbox, Input, Select, Toggle } from "@/shared/components";
import type {
  CrearRolFormData,
  CrearRolFormEntrada,
} from "../../schemas/crear-rol.schema";

const ROLES_OPCIONES = [
  "Residente Inquilino Lider",
  "Coadministrador",
  "Residente",
  "Propietario",
];
const TIPO_DOC_OPCIONES = ["Cedula", "Pasaporte", "DNI"];

interface Props {
  /* Lo que se esta rellenando: los `.default()` aun pueden estar vacios. */
  control: Control<CrearRolFormEntrada, unknown, CrearRolFormData>;
  errors: FieldErrors<CrearRolFormEntrada>;
  rol: string;
  onSubmit: () => void;
  editando: boolean;
}

export function PropietarioRolForm({
  control,
  errors,
  rol,
  onSubmit,
  editando,
}: Props) {
  return (
    <>
      <Controller
        control={control}
        name="rol"
        render={({ field }) => (
          <Select
            value={field.value || ""}
            options={ROLES_OPCIONES}
            onChange={(value) => field.onChange(String(value))}
            placeholder="Seleccione Rol:"
          />
        )}
      />
      {(rol === "Residente" ||
        rol === "Inquilino Lider" ||
        rol === "Propietario") && (
        <Controller
          control={control}
          name="esAnfitrionPrimario"
          render={({ field }) => (
            <Checkbox
              checked={!!field.value}
              onChange={field.onChange}
              label="Anfitrión primario"
            />
          )}
        />
      )}
      {(rol === "Coadministrador" || rol === "Propietario") && (
        <Controller
          control={control}
          name="esAdministradorPrimario"
          render={({ field }) => (
            <Checkbox
              checked={!!field.value}
              onChange={field.onChange}
              label="Administrador primario"
            />
          )}
        />
      )}
      <Controller
        control={control}
        name="nombre"
        render={({ field }) => (
          <Input
            value={field.value || ""}
            onChangeText={field.onChange}
            placeholder="Nombre y Apellido"
            error={errors.nombre?.message}
          />
        )}
      />
      {/*
        Al editar no se pide: el correo no se puede cambiar desde aqui --es el
        de la cuenta, y la identidad es `auth.users.id`-- y la consulta no lo
        trae, asi que salia en blanco y rellenarlo no hacia nada. Punto 49 de
        `REVISAR-A-OJO.md`.
      */}
      {!editando && (
        <Controller
          control={control}
          name="correo"
          render={({ field }) => (
            <Input
              value={field.value || ""}
              onChangeText={field.onChange}
              placeholder="Correo electrónico"
              type="email"
              error={errors.correo?.message}
            />
          )}
        />
      )}
      <View className="flex-row gap-2.5">
        <View className="flex-1">
          <Controller
            control={control}
            name="tipo"
            render={({ field }) => (
              <Select
                value={field.value || ""}
                options={TIPO_DOC_OPCIONES}
                onChange={(value) => field.onChange(String(value))}
                placeholder="Tipo"
              />
            )}
          />
        </View>
        <View className="flex-1">
          <Controller
            control={control}
            name="ci"
            render={({ field }) => (
              <Input
                value={field.value || ""}
                onChangeText={field.onChange}
                placeholder="Identificación"
                error={errors.ci?.message}
              />
            )}
          />
        </View>
      </View>
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
            name="telefono"
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
      {rol === "Residente" && (
        <Controller
          control={control}
          name="menorEdad"
          render={({ field }) => (
            <Checkbox
              checked={!!field.value}
              onChange={field.onChange}
              label="¿Es menor de edad?"
            />
          )}
        />
      )}
      <Text className="text-base font-bold text-center text-gray-900 underline mt-2">
        Contacto de Emergencia
      </Text>
      <Text
        className="text-xs text-center"
        style={{ color: theme.colors.textSecondary, lineHeight: 18 }}
      >
        Registrar un contacto alternativo es importante: permite ubicar a un
        familiar o allegado de confianza ante cualquier emergencia cuando no sea
        posible comunicarse con el residente.
      </Text>
      <Controller
        control={control}
        name="contactoNombre"
        render={({ field }) => (
          <Input
            value={field.value || ""}
            onChangeText={field.onChange}
            placeholder="Nombre y Apellido"
          />
        )}
      />
      <View className="flex-row gap-2.5">
        <View className="flex-1">
          <Controller
            control={control}
            name="contactoCodigo"
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
            name="contactoTelefono"
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
      <View
        className="rounded-2xl p-3.5"
        style={{
          backgroundColor: theme.colors.bgCard,
          shadowColor: theme.colors.shadow,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.08,
          shadowRadius: 8,
          elevation: 3,
        }}
      >
        <Text className="text-sm font-bold text-gray-900 mb-2.5">
          Visibilidad y contacto
        </Text>
        <Controller
          control={control}
          name="datosVisibles"
          render={({ field }) => (
            <View className="flex-row items-center justify-between mb-2.5">
              <Text className="text-sm text-gray-900">Datos visibles</Text>
              <Toggle value={!!field.value} onChange={field.onChange} />
            </View>
          )}
        />
        <Controller
          control={control}
          name="contactableChat"
          render={({ field }) => (
            <View className="flex-row items-center justify-between mb-2.5">
              <Text className="text-sm text-gray-900">
                Contactable por chat app
              </Text>
              <Toggle value={!!field.value} onChange={field.onChange} />
            </View>
          )}
        />
        <Controller
          control={control}
          name="contactableWhatsapp"
          render={({ field }) => (
            <View className="flex-row items-center justify-between">
              <Text className="text-sm text-gray-900">
                Contactable por WhatsApp
              </Text>
              <Toggle value={!!field.value} onChange={field.onChange} />
            </View>
          )}
        />
        <Text
          className="text-xs mt-2"
          style={{ color: theme.colors.textMuted }}
        >
          Si desactivas visibilidad, el contacto aparecerá como (oculto) y no
          será contactable.
        </Text>
      </View>
      {/*
          El monto del alquiler, la duración, los servicios incluidos y el
          monitoreo del pago son un **contrato**, y desde que existe la tabla
          tienen su propia pantalla. Pedirlos aquí los mezclaba con el alta de
          la persona y los escribía en un store que se perdía al recargar.
      */}
      <Text className="text-xs" style={{ color: theme.colors.textMuted }}>
        El alquiler y los servicios incluidos se registran en «Contratos de
        arrendamiento», desde la configuración de la vivienda.
      </Text>
      <Button variant="primary" onPress={onSubmit}>
        {editando ? "Guardar cambios" : "Aceptar"}
      </Button>
      <View className="h-6" />
    </>
  );
}
