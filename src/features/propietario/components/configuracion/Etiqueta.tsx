import React from "react";
import { Text, View } from "react-native";

/**
 * Una etiqueta redonda de la ficha del propietario: «Anfitrión primario»,
 * «Propietario», «Residente»... Va en un `View` y no como texto dentro de otro
 * texto: así el fondo redondeado se pinta entero y las etiquetas pueden saltar
 * de línea juntas cuando la pantalla es angosta.
 */
export function Etiqueta({
  texto,
  fondo,
  color,
}: {
  texto: string;
  fondo: string;
  color: string;
}) {
  return (
    <View className="rounded-full px-2.5 py-0.5" style={{ backgroundColor: fondo }}>
      <Text className="text-xs font-bold" style={{ color }}>
        {texto}
      </Text>
    </View>
  );
}
