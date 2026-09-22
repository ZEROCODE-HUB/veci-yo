import { theme } from "@/config";
import { Text, View } from "react-native";
import { Button, CampoFecha, Input, Select } from "@/shared/components";
import {
  ROLES_INVITABLES,
  type FormularioInvitacion as Valores,
} from "../../hooks/useInvitarAUnidad";

interface Props {
  form: Valores;
  esHuesped: boolean;
  error: string | null;
  invitando: boolean;
  onChange: (valores: Valores) => void;
  onEnviar: () => void;
}

export function FormularioInvitacion({
  form,
  esHuesped,
  error,
  invitando,
  onChange,
  onEnviar,
}: Props) {
  const set = (cambios: Partial<Valores>) => onChange({ ...form, ...cambios });

  return (
    <View className="gap-3">
      <Text className="text-base font-bold text-gray-900">
        Invitar a alguien
      </Text>

      <Input
        label="Nombre y apellido"
        value={form.nombre}
        onChangeText={(nombre) => set({ nombre })}
        placeholder="Ej. Ana Restrepo"
      />

      <Input
        label="Correo"
        type="email"
        value={form.correo}
        onChangeText={(correo) => set({ correo })}
        placeholder="ana@correo.com"
      />

      <Select
        label="Rol en la vivienda"
        value={form.rol}
        options={ROLES_INVITABLES}
        onChange={(rol) => set({ rol: rol as Valores["rol"] })}
      />

      {/* Un huésped no puede existir sin fecha de salida: la restricción está
          en la base y aquí se pide antes de llegar a ella. */}
      {esHuesped && (
        <View className="gap-3">
          <CampoFecha
            label="Llega el"
            value={form.vigenteDesde}
            onChange={(vigenteDesde) => set({ vigenteDesde })}
            placeholder="Sin fecha de llegada"
          />
          <CampoFecha
            label="Se va el"
            value={form.vigenteHasta}
            onChange={(vigenteHasta) => set({ vigenteHasta })}
            placeholder="Elegir el último día"
          />
          <Text className="text-xs" style={{ color: theme.colors.textSecondary }}>
            Verá el alojamiento desde que acepte la invitación. El wifi y las
            instrucciones de entrada, solo a partir del día de llegada.
          </Text>
        </View>
      )}

      {error && (
        <Text className="text-xs" style={{ color: theme.colors.danger }}>
          {error}
        </Text>
      )}

      <Button
        variant="primary"
        onPress={onEnviar}
        disabled={Boolean(error) || invitando}
      >
        {invitando ? "Enviando…" : "Enviar invitación"}
      </Button>
    </View>
  );
}
