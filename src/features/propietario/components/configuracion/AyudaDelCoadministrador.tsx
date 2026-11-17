import React from "react";
import { Text, View } from "react-native";
import { theme } from "@/config";
import { ESTILO_DE_TARJETA } from "./gruposDeResidentes";

/**
 * Qué es un anfitrión, arriba de la configuración de la vivienda.
 *
 * Sin el título, en pantalla esto es un párrafo suelto justo debajo del «+» de
 * la cabecera, y parece explicar lo que hace ese botón --que en realidad agrega
 * a cualquiera, no solo a un anfitrión--.
 *
 * Hasta el 17/11/2026 decía «Coadministrador» y lo pintaba como quien hace
 * pagos por el dueño. El cliente lo aclaró: es quien atiende la renta corta
 * por él. En la base sigue siendo el rol `coadministrador`.
 */
export function AyudaDelCoadministrador() {
  return (
    <View className="rounded-2xl p-4 flex-row items-start gap-3" style={ESTILO_DE_TARJETA}>
      <View className="flex-1 gap-1">
        <Text className="text-sm font-bold text-gray-900">Anfitrión</Text>
        <Text className="text-sm" style={{ color: theme.colors.textStrong, lineHeight: 20 }}>
          Quien atiende la renta corta por ti, por ejemplo una empresa de Airbnb
          o un familiar. Puede configurar la renta corta de esta vivienda y
          recibir a tus huéspedes.
        </Text>
      </View>
      <Text style={{ fontSize: 22 }}>▶️</Text>
    </View>
  );
}
