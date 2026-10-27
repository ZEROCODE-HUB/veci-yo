import React from "react";
import { Text, View } from "react-native";
import { theme } from "@/config";
import { ESTILO_DE_TARJETA } from "./gruposDeResidentes";

/**
 * Qué es un coadministrador, arriba de la configuración de la vivienda.
 *
 * Sin el título, en pantalla esto es un párrafo suelto justo debajo del «+» de
 * la cabecera, y parece explicar lo que hace ese botón --que en realidad agrega
 * a cualquiera, no solo a un coadministrador--.
 */
export function AyudaDelCoadministrador() {
  return (
    <View className="rounded-2xl p-4 flex-row items-start gap-3" style={ESTILO_DE_TARJETA}>
      <View className="flex-1 gap-1">
        <Text className="text-sm font-bold text-gray-900">Coadministrador</Text>
        <Text className="text-sm" style={{ color: theme.colors.textStrong, lineHeight: 20 }}>
          Empresa o persona que te ayuda con la gestión de tu propiedad, ej:
          realizando pagos. Podrá administrar tu propiedad en esta aplicación con
          tus mismas funcionalidades.
        </Text>
      </View>
      <Text style={{ fontSize: 22 }}>▶️</Text>
    </View>
  );
}
