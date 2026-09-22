import { theme } from "@/config";
import { Pressable, Text, View } from "react-native";
import { formatDateIso } from "@/shared/utils";
import { ROLES_INVITABLES } from "../../hooks/useInvitarAUnidad";
import type { InvitacionPendiente } from "../../services/invitacionesUnidad.repo";

const etiquetaRol = (rol: string | null) =>
  ROLES_INVITABLES.find((r) => r.value === rol)?.label ?? rol ?? "";

/** Las invitadas que todavía no han aceptado. Se pueden revocar. */
export function InvitacionesPendientes({
  pendientes,
  onRevocar,
}: {
  pendientes: InvitacionPendiente[];
  onRevocar: (id: string) => void;
}) {
  if (pendientes.length === 0) return null;

  return (
    <View className="gap-2">
      <Text className="text-base font-bold text-gray-900">
        Invitaciones sin aceptar
      </Text>

      {pendientes.map((invitacion) => (
        <View
          key={invitacion.id}
          className="flex-row justify-between items-center rounded-xl p-3"
          style={{ backgroundColor: theme.colors.bgMuted }}
        >
          <View className="flex-1 pr-2">
            <Text className="text-sm font-bold text-gray-900">
              {invitacion.nombre || invitacion.correo}
            </Text>
            <Text
              className="text-xs"
              style={{ color: theme.colors.textSecondary }}
            >
              {invitacion.correo} · {etiquetaRol(invitacion.rol)}
              {invitacion.vigenteHasta
                ? ` · estancia hasta el ${formatDateIso(invitacion.vigenteHasta)}`
                : ""}
            </Text>
          </View>

          <Pressable onPress={() => onRevocar(invitacion.id)} hitSlop={8}>
            <Text
              className="text-xs font-medium"
              style={{ color: theme.colors.danger }}
            >
              Revocar
            </Text>
          </Pressable>
        </View>
      ))}
    </View>
  );
}
