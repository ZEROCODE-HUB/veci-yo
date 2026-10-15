import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "@/config";
import type { ReservaZona } from "@/shared/types";

/**
 * Lo que ve la portería al entrar a una zona común: quién la tiene reservada
 * ese día (15/10/2026).
 *
 * Antes veía la grilla para reservar, igual que un vecino. Tocar una reserva
 * abre lo que la portería sí hace con ella: editar quiénes vienen y anotar una
 * incidencia.
 */
export function ReservasDelDiaPorteria({
  reservas,
  dia,
  onSeleccionar,
}: {
  reservas: ReservaZona[];
  /** Cómo se lee el día arriba de la lista: «hoy», «el 16/10/2026». */
  dia: string;
  onSeleccionar: (reserva: ReservaZona) => void;
}) {
  return (
    <View
      className="bg-white rounded-2xl p-3 gap-2"
      style={{ boxShadow: theme.shadows.card }}
    >
      <Text className="text-sm font-semibold text-gray-900">
        Reservas de {dia}
      </Text>
      {reservas.length === 0 ? (
        <Text className="text-xs text-gray-500">No hay reservas ese día.</Text>
      ) : (
        reservas.map((r) => {
          const personas = r.personas.length || 1 + (r.acompanantes || 0);
          return (
            <Pressable
              key={r.uuid ?? r.id}
              accessibilityRole="button"
              accessibilityLabel={`Reserva de ${r.depto}, ${r.horario}`}
              onPress={() => onSeleccionar(r)}
              className="flex-row items-center gap-3 rounded-xl p-3"
              style={{ backgroundColor: theme.colors.bgMuted }}
            >
              <View className="items-center" style={{ width: 64 }}>
                <Text className="text-xs font-bold text-gray-900 text-center">
                  {r.horario}
                </Text>
              </View>
              <View className="flex-1">
                <Text className="text-sm font-semibold text-gray-900">
                  {r.depto}
                  {r.solicitante ? ` · ${r.solicitante}` : ""}
                </Text>
                <Text className="text-xs text-gray-500">
                  {`${personas} ${personas === 1 ? "persona" : "personas"}`}
                  {r.numeroRecurso ? ` · N°${r.numeroRecurso}` : ""}
                  {` · ${r.estado}`}
                </Text>
              </View>
              <Ionicons name="ellipsis-vertical" size={16} color={theme.colors.textSecondary} />
            </Pressable>
          );
        })
      )}
    </View>
  );
}
