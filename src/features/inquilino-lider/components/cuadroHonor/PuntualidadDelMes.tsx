import React from "react";
import { Text, View } from "react-native";
import { theme } from "@/config";
import { formatDateIso } from "@/shared/utils";
import {
  filasDePuntualidad,
  type PuntualidadMes,
  type TonoDePuntualidad,
} from "../../helpers/puntualidad";

/**
 * Cuánto del mes se pagó a tiempo, cuánto con atraso y cuánto falta, en
 * viviendas y en dinero (pedido del cliente, 17/11/2026).
 *
 * El 29/09/2026 se quitó de aquí una barra roja «Con retraso / Deudor» porque
 * convertía el cuadro en un tablero de morosos (punto 71). Esto es otra cosa:
 * son totales del edificio, sin nombres, y lo pidió el cliente. Lo que falta
 * solo se pinta como mora cuando el plazo ya pasó; antes es gris.
 */
export function PuntualidadDelMes({ puntualidad }: { puntualidad: PuntualidadMes }) {
  const filas = filasDePuntualidad(puntualidad);
  const colorDe = (tono: TonoDePuntualidad) =>
    tono === "enFecha"
      ? theme.colors.success
      : tono === "conAtraso"
        ? theme.colors.warning
        : puntualidad.yaVencio
          ? theme.colors.danger
          : theme.colors.borderStrong;

  return (
    <View className="gap-2.5">
      <View className="flex-row justify-between">
        <Text className="text-xs font-semibold text-gray-700">Puntualidad</Text>
        <Text className="text-xs text-gray-500">Vence el {formatDateIso(puntualidad.venceEn)}</Text>
      </View>

      {/* Una sola barra con los tres trozos: se lee de un vistazo. */}
      <View
        className="w-full h-2.5 rounded-full overflow-hidden flex-row"
        style={{ backgroundColor: theme.colors.borderLight }}
      >
        {filas.map((fila) =>
          fila.parte > 0 ? (
            <View
              key={fila.tono}
              style={{ width: `${fila.parte * 100}%`, backgroundColor: colorDe(fila.tono) }}
            />
          ) : null,
        )}
      </View>

      {filas.map((fila) => (
        <View key={fila.tono} className="flex-row gap-2">
          <View
            className="mt-1 h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: colorDe(fila.tono) }}
          />
          <View className="flex-1">
            <Text className="text-sm text-gray-900">{fila.viviendas}</Text>
            {fila.monto ? <Text className="text-xs text-gray-500">{fila.monto}</Text> : null}
          </View>
        </View>
      ))}
    </View>
  );
}
