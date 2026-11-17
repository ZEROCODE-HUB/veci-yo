import { theme } from "@/config";
import { Text, View } from "react-native";
import {
  formatearCantidad,
  posicionDelUmbral,
  tramosDeLaBarra,
  type ResultadoDeEncuesta,
  type TramoDeBarra,
} from "../../helpers/resultadoDeEncuesta";

const COLOR: Record<TramoDeBarra["tono"], string> = {
  si: theme.colors.success,
  no: theme.colors.danger,
  otro: theme.colors.textMuted,
  falta: theme.colors.borderLight,
};

/**
 * La barra de una encuesta de Sí/No (17/11/2026): Sí, No, lo demás y lo que
 * falta por votar, medidos contra el TOTAL posible, con una marca vertical
 * donde está el umbral. Así se ve de un vistazo cuánto le falta al Sí.
 */
export function BarraDeResultado({ resultado }: { resultado: ResultadoDeEncuesta }) {
  const tramos = tramosDeLaBarra(resultado);
  const umbral = posicionDelUmbral(resultado);

  return (
    <View className="gap-2">
      <View
        className="relative h-4 w-full flex-row overflow-hidden rounded-full"
        style={{ backgroundColor: theme.colors.borderLight }}
        accessibilityLabel={tramos
          .map((t) => `${t.etiqueta} ${Math.round(t.ancho)} %`)
          .join(", ")}
      >
        {tramos.map((t) => (
          <View key={t.clave} style={{ width: `${t.ancho}%`, backgroundColor: COLOR[t.tono] }} />
        ))}
        {umbral !== null ? (
          <View
            className="absolute top-0 bottom-0"
            style={{ left: `${umbral}%`, width: 2, marginLeft: -1, backgroundColor: theme.colors.text }}
          />
        ) : null}
      </View>
      <View className="flex-row flex-wrap gap-x-3 gap-y-1">
        {tramos.map((t) => (
          <View key={t.clave} className="flex-row items-center gap-1">
            <View className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: COLOR[t.tono] }} />
            <Text className="text-xs text-gray-600">
              {t.tono === "falta" ? t.etiqueta : `${t.etiqueta} ${formatearCantidad(pesoDe(resultado, t.clave))}`}
            </Text>
          </View>
        ))}
        {umbral !== null ? (
          <View className="flex-row items-center gap-1">
            <View className="h-2.5 rounded-sm" style={{ width: 2, backgroundColor: theme.colors.text }} />
            <Text className="text-xs text-gray-600">
              {`Umbral ${formatearCantidad(resultado.umbralPorcentaje ?? 0)} %`}
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

function pesoDe(r: ResultadoDeEncuesta, id: string): number {
  return r.opciones.find((o) => o.id === id)?.peso ?? 0;
}
