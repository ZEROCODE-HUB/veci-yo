import React from "react";
import { Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { SegunLaCarga, estadoDe } from "@/shared/components";
import { formatDateTime } from "@/shared/utils";
import { accionesDeReserva } from "@/features/zonas/services/bitacoraDeReserva.repo";

const QUE_PASO: Record<string, string> = {
  creada: "La creó",
  editada: "La editó",
  aprobada: "La aprobó",
  rechazada: "La rechazó",
  cancelada: "La canceló",
  adjunto: "Adjuntó un documento",
  terminada: "Terminó",
};

/**
 * Quién hizo qué en una reserva (18/11/2026, pedido del cliente: «que se
 * registren todas las acciones, y que el admin vea qué cosas se hicieron en
 * esa reserva»). Lo escribe la base (`reserva_zona_accion`).
 */
export function BitacoraDeReserva({ reservaId }: { reservaId: string }) {
  const consulta = useQuery({
    queryKey: ["reservas", "bitacora", reservaId],
    queryFn: () => accionesDeReserva(reservaId),
    enabled: Boolean(reservaId),
  });
  const acciones = consulta.data ?? [];
  return (
    <View className="gap-1">
      <Text className="mb-1 text-sm text-gray-500">Historial</Text>
      <SegunLaCarga estado={estadoDe(consulta)} texto="el historial" forma="lineas" cuantos={2} enLinea>
        {acciones.length === 0 ? (
          <Text className="text-sm text-gray-500">Sin movimientos.</Text>
        ) : (
          acciones.map((a) => (
            <Text key={a.id} className="text-xs leading-4 text-gray-700">
              {formatDateTime(a.cuando)} · {a.quien ?? "La base"}: {QUE_PASO[a.accion] ?? a.accion}
              {a.cambio ? ` (${a.cambio})` : ""}
            </Text>
          ))
        )}
      </SegunLaCarga>
    </View>
  );
}
