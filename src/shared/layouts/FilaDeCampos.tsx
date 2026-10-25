import React from "react";
import { View, useWindowDimensions } from "react-native";

/**
 * Si los campos de una fila tienen que ir uno debajo del otro.
 *
 * Dos desplegables lado a lado miden 140 cada uno en un celular de 320, y un
 * valor como «Mañana (06:00 - 12:00)» o «Cédula de ciudadanía» salía cortado
 * (auditoría de responsividad, 25/10/2026). Por debajo de 360 de ancho, o con
 * la letra del teléfono grande, se apilan.
 */
export function useCamposApilados(): boolean {
  const { width, fontScale } = useWindowDimensions();
  return width < 360 || fontScale > 1.15;
}

/**
 * Una fila de campos que se apila en pantallas estrechas.
 *
 * Cada hijo va envuelto aquí --a partes iguales en fila, a lo ancho en
 * columna--, así que no se le pone `flex-1`: en columna, un `flex: 1` sin alto
 * fijo deja el campo en cero.
 */
export function FilaDeCampos({
  children,
  gap = 8,
}: {
  children: React.ReactNode;
  gap?: number;
}) {
  const apilar = useCamposApilados();
  const hijos = React.Children.toArray(children).filter(Boolean);
  return (
    <View style={{ flexDirection: apilar ? "column" : "row", gap }}>
      {hijos.map((hijo, i) => (
        <View key={i} style={apilar ? undefined : { flex: 1 }}>
          {hijo}
        </View>
      ))}
    </View>
  );
}
