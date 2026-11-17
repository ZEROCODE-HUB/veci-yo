import { theme } from "@/config";
import { Text, View } from "react-native";
import {
  barrasPorOpcion,
  posicionDelUmbral,
  type ResultadoDeEncuesta,
} from "../../helpers/resultadoDeEncuesta";

/**
 * Una barra por opción, para las encuestas que no son de Sí/No (17/11/2026).
 * Cada una se mide contra el total posible, con la marca del umbral si lo
 * hay; la que va primero, resaltada.
 */
export function BarrasPorOpcion({ resultado }: { resultado: ResultadoDeEncuesta }) {
  const umbral = posicionDelUmbral(resultado);
  return (
    <View className="gap-3">
      {barrasPorOpcion(resultado).map((b) => (
        <View key={b.id} className="gap-1">
          <View className="flex-row justify-between">
            <Text className={`text-sm ${b.lider ? "font-bold text-gray-900" : "text-gray-700"}`}>{b.etiqueta}</Text>
            <Text className="text-sm text-gray-500">{b.valor}</Text>
          </View>
          <View
            className="relative h-2.5 w-full overflow-hidden rounded-full"
            style={{ backgroundColor: theme.colors.borderLight }}
          >
            <View
              className="h-2.5 rounded-full"
              style={{
                width: `${b.ancho}%`,
                backgroundColor: b.lider ? theme.colors.success : theme.colors.secondary,
              }}
            />
            {umbral !== null ? (
              <View
                className="absolute top-0 bottom-0"
                style={{ left: `${umbral}%`, width: 2, marginLeft: -1, backgroundColor: theme.colors.text }}
              />
            ) : null}
          </View>
        </View>
      ))}
    </View>
  );
}
