import { theme } from "@/config";
import { View, Text } from "react-native";
import { Controller, type Control } from "react-hook-form";
import { Button, Checkbox, InfoButton, Input, Toggle } from "@/shared/components";
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
  /** Mientras se guarda: el botón gira y no manda dos veces. */
  guardando?: boolean;
  /**
   * El contacto de emergencia lo ponen el propietario o el inquilino líder
   * (18/11/2026, pedido del cliente; la base lo sujeta). A los demás se les
   * enseña, sin poder cambiarlo.
   */
  puedePonerContacto?: boolean;
}

export function PropietarioRolForm({
  control,
  rol,
  onSubmit,
  editando,
  guardando = false,
  puedePonerContacto = true,
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
            <View className="flex-row items-center gap-1">
              <Checkbox
                checked={!!field.value}
                onChange={field.onChange}
                label="Anfitrión primario"
              />
              <InfoButton
                titulo="Anfitrión primario"
                descripcion="A quien llama primero la portería cuando llega una visita, y a quien contactan los huéspedes. Hay uno por vivienda."
                size={16}
              />
            </View>
          )}
        />
      )}
      {/* El anfitrión se llamaba «Coadministrador» y la casilla no salía (18/11/2026). */}
      {(rol === "Anfitrión" || rol === "Coadministrador" || rol === "Propietario") && (
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
      {/*
        Más simple (18/11/2026, pedido del cliente): a quién llamar si no
        se le encuentra, con nombre y teléfono. Solo lo ponen el propietario
        o el inquilino líder.
      */}
      <View className="gap-1 mt-2">
        <Text className="text-base font-bold text-gray-900">Contacto de emergencia (opcional)</Text>
        <Text className="text-xs" style={{ color: theme.colors.textSecondary, lineHeight: 18 }}>
          {puedePonerContacto
            ? "A quién llamar si pasa algo y no se puede ubicar a esta persona: un familiar o alguien de confianza."
            : "Lo ponen el propietario o el inquilino líder de la vivienda."}
        </Text>
      </View>
      {puedePonerContacto ? (
      <>
      <Controller
        control={control}
        name="contactoNombre"
        render={({ field, fieldState }) => (
          <Input
            soloLetras
            value={field.value || ""}
            onChangeText={field.onChange}
            label="Nombre (opcional)"
            placeholder="Ej. Ana Pérez (su hermana)"
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
                label="Prefijo (opcional)"
                placeholder="+57"
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
                label="Teléfono (opcional)"
                placeholder="300 123 4567"
                error={fieldState.error?.message}
              />
            )}
          />
        </View>
      </View>
      </>
      ) : null}
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
        <Text className="text-sm font-bold text-gray-900">
          Qué ven los vecinos
        </Text>
        <Text className="text-xs mb-2.5" style={{ color: theme.colors.textMuted }}>
          Lo decide cada persona sobre sí misma.
        </Text>
        <Controller
          control={control}
          name="datosVisibles"
          render={({ field }) => (
            <View className="flex-row items-center justify-between mb-2.5">
              <View className="shrink gap-0.5">
                <Text className="text-sm text-gray-900">Datos visibles</Text>
                <Text className="text-xs text-gray-500">Su nombre y su vivienda salen en el directorio del edificio.</Text>
              </View>
              <Toggle value={!!field.value} onChange={field.onChange} />
            </View>
          )}
        />
        <Controller
          control={control}
          name="contactableChat"
          render={({ field }) => (
            <View className="flex-row items-center justify-between mb-2.5">
              <View className="shrink gap-0.5">
                <Text className="text-sm text-gray-900">Se le puede escribir por el chat</Text>
                <Text className="text-xs text-gray-500">Los vecinos le pueden mandar mensajes en Veciyo.</Text>
              </View>
              <Toggle value={!!field.value} onChange={field.onChange} />
            </View>
          )}
        />
        <Controller
          control={control}
          name="contactableWhatsapp"
          render={({ field }) => (
            <View className="flex-row items-center justify-between">
              <View className="shrink gap-0.5">
                <Text className="text-sm text-gray-900">Se le puede escribir por WhatsApp</Text>
                <Text className="text-xs text-gray-500">Su número aparece para escribirle por WhatsApp.</Text>
              </View>
              <Toggle value={!!field.value} onChange={field.onChange} />
            </View>
          )}
        />
        <Text
          className="text-xs mt-2"
          style={{ color: theme.colors.textMuted }}
        >
          Si apaga «Datos visibles», sale como «(oculto)» y nadie le puede escribir.
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
      <Button variant="primary" onPress={onSubmit} loading={guardando}>
        {editando ? "Guardar cambios" : "Aceptar"}
      </Button>
      <View className="h-6" />
    </>
  );
}
