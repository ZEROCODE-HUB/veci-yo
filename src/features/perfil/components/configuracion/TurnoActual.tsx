import React from "react";
import { Text, View } from "react-native";
import { theme } from "@/config";
import { Button } from "@/shared/components";
import { formatRangoHoras } from "@/shared/utils";
import { usePerfil } from "../../hooks/usePerfil";

const FILA = { borderBottomWidth: 1, borderBottomColor: theme.colors.borderLight };

/**
 * El turno del guardia en su configuración.
 *
 * Decía siempre «En turno activo» y «Garita: Principal», escritos a mano, y
 * «Terminar turno» ponía una bandera en la memoria del teléfono (13/10/2026).
 * Ahora sale de su horario, con lo que cambie hoy.
 */
export function TurnoActual() {
  const { guardiaActual, turnoActual, terminarTurno, terminandoTurno } = usePerfil();
  return (
    <View
      className="bg-white rounded-xl p-4"
      style={{
        shadowColor: theme.colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
      }}
    >
      <Text className="text-base font-bold text-gray-900 text-center mb-3.5">Turno Actual</Text>
      {turnoActual ? (
        <View className="gap-2">
          <View className="flex-row justify-between items-center py-2.5" style={FILA}>
            <Text className="text-sm text-gray-500">Estado</Text>
            <Text className="text-sm font-semibold" style={{ color: theme.colors.success }}>
              En turno · {formatRangoHoras(turnoActual.horaInicio, turnoActual.horaFin)}
            </Text>
          </View>
          {guardiaActual?.garita ? (
            <View className="flex-row justify-between items-center py-2.5" style={FILA}>
              <Text className="text-sm text-gray-500">Portería</Text>
              <Text className="text-sm text-gray-900">{guardiaActual.garita}</Text>
            </View>
          ) : null}
          <View className="mt-3">
            <Button variant="danger" loading={terminandoTurno} onPress={() => terminarTurno()}>
              Terminar turno
            </Button>
          </View>
        </View>
      ) : (
        <View className="flex-row justify-between items-center py-2.5">
          <Text className="text-sm text-gray-500">Estado</Text>
          <Text className="text-sm text-gray-400 font-medium">Sin turno en curso</Text>
        </View>
      )}
    </View>
  );
}
