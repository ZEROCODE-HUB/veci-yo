import { theme } from "@/config";
import { View, Text } from "react-native";
import { Controller, type Control } from "react-hook-form";
import { Button, Checkbox, Input, Toggle } from "@/shared/components";
import type {
  CrearRolFormData,
  CrearRolFormEntrada,
} from "../../schemas/crear-rol.schema";

interface Props {
  /* Lo que se esta rellenando: los `.default()` aun pueden estar vacios. */
  control: Control<CrearRolFormEntrada, unknown, CrearRolFormData>;
  rol: string;
  onSubmit: () => void;
  editando: boolean;
}

export function PropietarioRolForm({
  control,
  rol,
  onSubmit,
  editando,
}: Props) {
  return (
    <>
      {/*
        El rol, el nombre, el teléfono y «menor de edad» **no se editan aquí**.
        Se pintaban como campos, se podían cambiar, la pantalla decía «Cambios
        guardados» y no se guardaba ninguno (13/10/2026): el nombre y el
        teléfono son del perfil de esa persona, y cambiarle el rol es volver a
        invitarla. Ahora se leen, que es lo que de verdad se puede hacer con
        ellos desde esta pantalla.
      */}
      <View
        className="rounded-2xl p-3.5 gap-1"
        style={{ backgroundColor: theme.colors.bgMuted }}
      >
        <Controller
          control={control}
          name="nombre"
          render={({ field }) => (
            <Text className="text-base font-bold text-gray-900">
              {field.value || "Sin nombre"}
            </Text>
          )}
        />
        <Text className="text-sm text-gray-500">{rol || "Sin rol"}</Text>
        <Controller
          control={control}
          name="telefono"
          render={({ field }) =>
            field.value ? (
              <Text className="text-sm text-gray-500">📞 {field.value}</Text>
            ) : (
              <Text className="text-sm text-gray-400">Sin teléfono</Text>
            )
          }
        />
        <Text className="text-xs text-gray-400 mt-1">
          El nombre y el teléfono los cambia esa persona desde su perfil. Para
          darle otro rol, dala de baja e invítala de nuevo.
        </Text>
      </View>
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
      <Text className="text-base font-bold text-center text-gray-900 underline mt-2">
        Contacto de emergencia
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
        render={({ field, fieldState }) => (
          <Input
            value={field.value || ""}
            onChangeText={field.onChange}
            placeholder="Nombre y Apellido"
          error={fieldState.error?.message}
          />
        )}
      />
      <View className="flex-row gap-2.5">
        <View className="flex-1">
          <Controller
            control={control}
            name="contactoCodigo"
            render={({ field, fieldState }) => (
              <Input
                value={field.value || ""}
                onChangeText={field.onChange}
                placeholder="Código de país (+57)"
              error={fieldState.error?.message}
              />
            )}
          />
        </View>
        <View className="flex-1">
          <Controller
            control={control}
            name="contactoTelefono"
            render={({ field, fieldState }) => (
              <Input
                value={field.value || ""}
                onChangeText={field.onChange}
                placeholder="Número de teléfono"
              error={fieldState.error?.message}
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
              <Text className="shrink text-sm text-gray-900">Datos visibles</Text>
              <Toggle value={!!field.value} onChange={field.onChange} />
            </View>
          )}
        />
        <Controller
          control={control}
          name="contactableChat"
          render={({ field }) => (
            <View className="flex-row items-center justify-between mb-2.5">
              <Text className="shrink text-sm text-gray-900">
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
              <Text className="shrink text-sm text-gray-900">
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
