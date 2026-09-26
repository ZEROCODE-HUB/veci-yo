import { theme } from "@/config";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";
import type { Guardia } from "@/shared/types";
import { isOnShift } from "../../helpers/seguridad.helpers";
import { formatRangoHoras } from "@/shared/utils";

export function GuardiasList({
  guardias,
  onMenu,
}: {
  guardias: Guardia[];
  onMenu: (guardia: Guardia) => void;
}) {
  return (
    <View className="gap-3">
      {guardias.map((guardia) => (
        <View
          key={guardia.id}
          className={`rounded-2xl bg-white p-4 gap-3 border ${isOnShift(guardia) ? "border-green-500" : "border-gray-100"}`}
        >
          <View className="flex-row items-start gap-3">
            <View className="h-10 w-10 items-center justify-center rounded-full bg-gray-100">
              <Text className="text-xl">👤</Text>
            </View>
            <View className="flex-1">
              <Text className="text-base font-bold text-gray-900">
                {guardia.nombre}
              </Text>
              {/* Sin documento cargado se pintaba el icono a secas, que parece
                  un dato roto en vez de un dato que falta. */}
              {guardia.cedula ? (
                <Text className="text-sm text-gray-500">🪪 {guardia.cedula}</Text>
              ) : (
                <Text className="text-sm text-gray-400">Sin documento cargado</Text>
              )}
              {/* Pintaba `turnos[0]`: un guardia con tres turnos mostraba uno,
                  y el administrador no podia ver cuando trabaja su personal.
                  Los turnos vienen ya ordenados por dia desde el repositorio. */}
              {guardia.turnos.length === 0 ? (
                <Text className="mt-1 text-sm text-gray-500">Sin turnos</Text>
              ) : (
                guardia.turnos.map((turno) => (
                  <Text
                    key={turno.uuid ?? `${turno.dia}-${turno.horaInicio}`}
                    className="mt-1 text-sm text-gray-500"
                  >
                    {turno.dia} · {formatRangoHoras(turno.horaInicio, turno.horaFin)}
                  </Text>
                ))
              )}
            </View>
            <Pressable onPress={() => onMenu(guardia)} className="p-1">
              <Ionicons name="ellipsis-vertical" size={21} color={theme.colors.textSecondary} />
            </Pressable>
          </View>
          <View className="flex-row gap-2">
            <CommunicationBadge
              label="Chat"
              enabled={guardia.permisoChat ?? true}
            />
            <CommunicationBadge
              label="Llamadas"
              enabled={guardia.permisoLlamadas ?? true}
            />
          </View>
        </View>
      ))}
      {!guardias.length && (
        <Text className="py-8 text-center text-sm text-gray-500">
          No hay guardias que coincidan con los filtros.
        </Text>
      )}
    </View>
  );
}

function CommunicationBadge({
  label,
  enabled,
}: {
  label: string;
  enabled: boolean;
}) {
  return (
    <View
      className={`rounded-full px-2 py-1 ${enabled ? "bg-green-50" : "bg-gray-100"}`}
    >
      <Text
        className={`text-xs font-semibold ${enabled ? "text-green-700" : "text-gray-500"}`}
      >
        {label} {enabled ? "✓" : "✗"}
      </Text>
    </View>
  );
}
