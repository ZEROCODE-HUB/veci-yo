import React from "react";
import { Text, View } from "react-native";
import type { VisitaItem } from "@/shared/types";
import { textoDeDias } from "../helpers/diasDeTrabajo";

/** Cuántas jornadas se enseñan: las últimas, que son las que se discuten. */
const ULTIMAS = 10;

/**
 * Qué días viene un profesional permanente y cuándo vino de verdad.
 *
 * Antes solo quedaba la última entrada y la última salida: no había forma de
 * saber qué días había venido la empleada (13/10/2026). Cada vez que la
 * portería marca su entrada queda un renglón.
 */
export function AsistenciaDelPermanente({ item }: { item: VisitaItem }) {
  const jornadas = (item.jornadas ?? []).slice(0, ULTIMAS);

  return (
    <View className="rounded-xl bg-gray-50 p-3 gap-1.5">
      <Text className="text-xs font-semibold text-gray-500">
        Registro permanente
      </Text>
      <Text className="text-sm text-gray-900">
        Viene: {textoDeDias(item.diasTrabajo)}
      </Text>

      <Text className="mt-1 text-xs font-semibold text-gray-500">
        Asistencia
      </Text>
      {jornadas.length ? (
        jornadas.map((jornada) => (
          <Text key={jornada.id} className="text-xs leading-5 text-gray-700">
            {jornada.fecha} · entró {jornada.entrada}
            {jornada.salida ? ` · salió ${jornada.salida}` : " · sigue dentro"}
            {jornada.fueraDeDia ? " · no era su día" : ""}
          </Text>
        ))
      ) : (
        <Text className="text-xs leading-5 text-gray-500">
          Todavía no hay ninguna entrada registrada.
        </Text>
      )}
    </View>
  );
}
