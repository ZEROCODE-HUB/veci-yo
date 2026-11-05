import React from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "@/config";
import { Card } from "@/shared/components/ui";
import { useNavegacionPlataforma } from "../hooks/useNavegacionPlataforma";
import type { PlataformaStackParamList } from "@/shared/types/navigation";
import { plural } from "@/shared/utils/plural.util";
import { DIAS_DE_ERRORES, useErroresDeLaApp } from "../hooks/useErroresDeLaApp";

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
  { ruta: "PlataformaPaises", titulo: "Países", detalle: "Moneda, zona horaria y documentos que se piden", icono: "earth-outline" },
  { ruta: "PlataformaMonedas", titulo: "Monedas", detalle: "Cuáles se ofrecen a los edificios", icono: "logo-usd" },
  { ruta: "PlataformaListas", titulo: "Listas", detalle: "Motivos, cargos, plataformas, siglas de la TRA…", icono: "list-outline" },
  { ruta: "PlataformaPermisos", titulo: "Permisos por rol", detalle: "Qué puede hacer cada rol, en general o por edificio", icono: "key-outline" },
  { ruta: "PlataformaDescuentos", titulo: "Descuentos", detalle: "Códigos para la suscripción", icono: "pricetag-outline" },
  { ruta: "PlataformaTextosLegales", titulo: "Textos legales", detalle: "Términos, privacidad y tratamiento de datos", icono: "document-text-outline" },
  { ruta: "PlataformaEquipo", titulo: "Equipo", detalle: "Quién opera Veciyo", icono: "people-outline" },
  { ruta: "PlataformaBitacora", titulo: "Bitácora", detalle: "Todo lo que se ha hecho desde el panel", icono: "time-outline" },
  { ruta: "PlataformaErrores", titulo: "Errores de la app", detalle: "Lo que falla en los celulares", icono: "bug-outline" },
];

export function PlataformaMasScreen() {
  const navegacion = useNavegacionPlataforma();
  // Cuántos errores hubo esta semana, a la vista sin entrar (05/11/2026).
  const errores = useErroresDeLaApp("error");
  const vecesConError = errores.grupos.reduce((total, g) => total + g.veces, 0);
  const detalleDe = (o: (typeof OPCIONES)[number]) =>
    o.ruta === "PlataformaErrores" && !errores.cargando && !errores.error
      ? vecesConError === 0
        ? `Ninguno en ${DIAS_DE_ERRORES} días`
        : `${plural(vecesConError, "error", "errores")} en ${DIAS_DE_ERRORES} días`
      : o.detalle;

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
              <Text className="text-xs text-gray-500">{detalleDe(o)}</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={theme.colors.textMuted} />
          </Pressable>
        ))}
      </Card>
    </ScrollView>
  );
}
