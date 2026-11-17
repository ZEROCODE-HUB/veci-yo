import { theme } from "@/config";
import { Text, View } from "react-native";
import { Button, CampoTelefono, Input, Tabs } from "@/shared/components";
import type { FormularioTrabajador as Valores } from "../../helpers/trabajadorPermanente";
import { ResumenDelRol } from "./ResumenDelRol";

interface Props {
  form: Valores;
  error: string | null;
  agregando: boolean;
  onChange: (valores: Valores) => void;
  onAgregar: () => void;
}

/**
 * «Agregar trabajador permanente» (17/11/2026, aprobado por el cliente): la
 * empleada, el chofer. Va aparte del formulario de invitar --no es un rol de
 * la vivienda: no vive ahí ni ve nada de ella-- y pregunta lo que decide
 * todo lo demás: «¿Le das usuario en la app?».
 */
export function FormularioTrabajador({ form, error, agregando, onChange, onAgregar }: Props) {
  const set = (cambios: Partial<Valores>) => onChange({ ...form, ...cambios });

  return (
    <View className="gap-3">
      <Text className="text-base font-bold text-gray-900">Agregar trabajador permanente</Text>
      <Text className="text-xs" style={{ color: theme.colors.textSecondary }}>
        Quien trabaja en la vivienda de forma fija: la empleada, el chofer. No
        cuenta como residente.
      </Text>

      <Input
        label="Nombre y apellido"
        soloLetras
        value={form.nombre}
        onChangeText={(nombre) => set({ nombre })}
        placeholder="Ej. Rosa Pérez"
      />
      <Input
        label="Oficio (opcional)"
        value={form.oficio}
        onChangeText={(oficio) => set({ oficio })}
        placeholder="Ej. Empleada doméstica, chofer"
      />
      <CampoTelefono
        label="Teléfono (opcional)"
        codigoPais={form.codigoPais}
        onCodigoPaisChange={(codigoPais) => set({ codigoPais })}
        telefono={form.telefono}
        onTelefonoChange={(telefono) => set({ telefono })}
        ayuda="Para que la portería lo llame o le anuncie a alguien."
      />

      <View className="gap-1.5">
        <Text className="text-sm font-semibold text-gray-900">¿Le das usuario en la app?</Text>
        <Tabs
          tabs={[
            { value: "no", label: "No" },
            { value: "si", label: "Sí" },
          ]}
          active={form.conApp ? "si" : "no"}
          allowDeselect={false}
          onChange={(v) => set({ conApp: v === "si" })}
        />
      </View>

      {form.conApp ? (
        <View className="gap-1">
          <Input
            label="Correo"
            type="email"
            value={form.correo}
            onChangeText={(correo) => set({ correo })}
            placeholder="rosa@correo.com"
          />
          <Text className="text-xs" style={{ color: theme.colors.textSecondary }}>
            Pídele que se descargue Veciyo y cree su cuenta con este correo: verá
            la invitación en Inicio.
          </Text>
        </View>
      ) : null}

      <ResumenDelRol rol={form.conApp ? "trabajador_con_app" : "trabajador_sin_app"} />

      {error && form.nombre.trim() ? (
        <Text className="text-xs" style={{ color: theme.colors.danger }}>
          {error}
        </Text>
      ) : null}

      <Button
        variant="primary"
        onPress={onAgregar}
        loading={agregando}
        disabled={Boolean(error) || agregando}
      >
        Agregar trabajador
      </Button>
    </View>
  );
}
