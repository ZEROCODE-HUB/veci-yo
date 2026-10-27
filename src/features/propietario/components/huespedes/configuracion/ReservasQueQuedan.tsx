import React from "react";
import { Text, View } from "react-native";
import { formatDateIso } from "@/shared/utils";
import type { ReservaPendiente } from "../../../services/suscripcion.repo";

/** Las reservas que le quedan al anfitrión al dar de baja la renta corta (hueco 47). */
export function ReservasQueQuedan({
  titulo,
  reservas,
}: {
  titulo: string;
  reservas: ReservaPendiente[];
}) {
  return (
    <View className="gap-1">
      <Text className="text-xs font-semibold text-gray-700">{titulo}</Text>
      {reservas.map((reserva) => (
        <Text key={reserva.id} className="text-xs text-gray-600">
          · {reserva.titular}: {formatDateIso(reserva.desde)} a {formatDateIso(reserva.hasta)}
        </Text>
      ))}
    </View>
  );
}
