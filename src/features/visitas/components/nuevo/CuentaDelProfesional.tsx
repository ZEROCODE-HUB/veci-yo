import { Text, View } from "react-native";
import { theme } from "@/config";
import { Tabs, Toggle } from "@/shared/components";
import type { AltaDeVisita } from "./tipos";

/**
 * «¿Tendrá cuenta en la app?» del profesional permanente (18/11/2026, pedido
 * del cliente). Un solo registro: la visita de todos los días y, con cuenta,
 * su acceso a la app con lo que puede hacer en ella.
 *
 * La portería y la administración no lo ven: quien decide es la vivienda.
 */
export function CuentaDelProfesional({ alta: v }: { alta: AltaDeVisita }) {
  if (v.tipoSeleccionado !== "permanente" || v.esGuardia || v.esAdmin) return null;

  const correo = v.email.trim();
  return (
    <View
      className="rounded-2xl p-4 gap-3"
      style={{ backgroundColor: theme.colors.bgMuted, boxShadow: theme.shadows.card }}
    >
      <View className="gap-1">
        <Text className="text-sm font-semibold text-gray-900">¿Tendrá cuenta en la app?</Text>
        <Text className="text-xs leading-4 text-gray-500">
          Sin cuenta, sale en el directorio de tu vivienda para que la portería lo ubique. Con cuenta, entra a
          Veciyo con su correo y hace solo lo que le permitas.
        </Text>
      </View>
      <Tabs
        tabs={[
          { value: "no", label: "No" },
          { value: "si", label: "Sí" },
        ]}
        active={v.conCuenta ? "si" : "no"}
        allowDeselect={false}
        onChange={(valor) => v.setConCuenta(valor === "si")}
      />
      {v.conCuenta ? (
        <View className="gap-3">
          <Text className="text-xs leading-4" style={{ color: correo ? theme.colors.textSecondary : theme.colors.danger }}>
            {correo
              ? `Le enviaremos el acceso a ${correo}. Tiene que entrar con ese mismo correo.`
              : "Escribe su correo arriba: ahí le enviaremos el acceso."}
          </Text>
          <View className="flex-row items-center justify-between gap-3">
            <View className="flex-1 gap-0.5">
              <Text className="text-sm text-gray-900">Puede contestar el citófono</Text>
              <Text className="text-xs leading-4 text-gray-500">
                Le suena cuando la portería llama a tu vivienda.
              </Text>
            </View>
            <Toggle
              value={v.puedeContestarCitofono}
              onChange={v.setPuedeContestarCitofono}
              accessibilityLabel="Puede contestar el citófono"
            />
          </View>
          <View className="flex-row items-center justify-between gap-3">
            <View className="flex-1 gap-0.5">
              <Text className="text-sm text-gray-900">Puede crear visitas</Text>
              <Text className="text-xs leading-4 text-gray-500">
                Anuncia amigos o profesionales que vienen a tu vivienda. Solo ve las visitas que él registró.
              </Text>
            </View>
            <Toggle
              value={v.puedeCrearVisitas}
              onChange={v.setPuedeCrearVisitas}
              accessibilityLabel="Puede crear visitas"
            />
          </View>
        </View>
      ) : null}
    </View>
  );
}
