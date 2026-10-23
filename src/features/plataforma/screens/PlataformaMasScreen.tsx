import React from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "@/config";
import { Card } from "@/shared/components/ui";
import { useNavegacionPlataforma } from "../hooks/useNavegacionPlataforma";
import type { PlataformaStackParamList } from "@/shared/types/navigation";

/**
 * Lo que no cabe en la barra de abajo: así son cinco pestañas y no nueve.
 */
const OPCIONES: {
  ruta: keyof PlataformaStackParamList;
  titulo: string;
  detalle: string;
  icono: React.ComponentProps<typeof Ionicons>["name"];
}[] = [
  { ruta: "PlataformaPrecios", titulo: "Planes y precios", detalle: "Lo que cuesta la renta corta y las verificaciones", icono: "cash-outline" },
  { ruta: "PlataformaDescuentos", titulo: "Descuentos", detalle: "Códigos para la suscripción", icono: "pricetag-outline" },
  { ruta: "PlataformaTextosLegales", titulo: "Textos legales", detalle: "Términos, privacidad y tratamiento de datos", icono: "document-text-outline" },
  { ruta: "PlataformaEquipo", titulo: "Equipo", detalle: "Quién opera Veciyo", icono: "people-outline" },
  { ruta: "PlataformaBitacora", titulo: "Bitácora", detalle: "Todo lo que se ha hecho desde el panel", icono: "time-outline" },
];

export function PlataformaMasScreen() {
  const navegacion = useNavegacionPlataforma();

  return (
    <ScrollView className="flex-1 bg-gray-50" contentContainerClassName="p-4">
      <Card className="p-0">
        {OPCIONES.map((o, i) => (
          <Pressable
            key={o.ruta}
            onPress={() => navegacion.navigate(o.ruta as never)}
            accessibilityRole="button"
            accessibilityLabel={o.titulo}
            className={`flex-row items-center gap-3 p-4 active:opacity-70 ${i > 0 ? "border-t border-gray-100" : ""}`}
          >
            <Ionicons name={o.icono} size={22} color={theme.colors.primary} />
            <View className="flex-1">
              <Text className="text-sm font-semibold text-gray-900">{o.titulo}</Text>
              <Text className="text-xs text-gray-500">{o.detalle}</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={theme.colors.textMuted} />
          </Pressable>
        ))}
      </Card>
    </ScrollView>
  );
}
