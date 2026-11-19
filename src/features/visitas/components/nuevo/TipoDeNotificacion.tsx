import React from "react";
import { Text, View } from "react-native";
import { theme } from "@/config";
import type { AltaDeVisita } from "./tipos";

/**
 * Cómo se avisa al residente de que alguien viene.
 *
 * **No aparece para el huésped temporal**, por decisión del cliente del
 * 02/10/2026: una estancia de varios días no se anuncia, se reserva. A la
 * portería se le dice que entra por anuncio.
 *
 * Y desde el 18/11/2026 tampoco para quien registra la visita (pedido del
 * cliente: «quitar el campo»): se notifica y se anuncia con llamada, que es
 * el valor por defecto de `aviso`. Solo queda el texto de la portería.
 */
export function TipoDeNotificacion({ alta: v }: { alta: AltaDeVisita }) {
  if (v.tipoSeleccionado === "huesped-temporal") return null;
  if (!v.esGuardia) return null;

  return (
    <View
      className="rounded-xl p-3"
      style={{ backgroundColor: theme.colors.borderLight, borderWidth: 1, borderColor: theme.colors.border }}
    >
      <Text className="text-sm text-gray-600 text-center">
        Ingreso mediante <Text className="font-bold">anuncio</Text>: se
        notificará en la app y se anunciará al residente con una llamada.
      </Text>
    </View>
  );
}
