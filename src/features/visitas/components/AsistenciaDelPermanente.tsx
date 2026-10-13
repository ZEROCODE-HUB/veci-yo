import React, { useState } from "react";
import { Pressable, Text, View } from "react-native";
import type { VisitaItem } from "@/shared/types";
import { Button } from "@/shared/components";
import { textoDeDias } from "../helpers/diasDeTrabajo";
import { DiasDeTrabajo } from "./nuevo/DiasDeTrabajo";

/** Cuántas jornadas se enseñan: las últimas, que son las que se discuten. */
const ULTIMAS = 10;

interface AsistenciaDelPermanenteProps {
  item: VisitaItem;
  /**
   * Si se da, quien mira puede cambiar los días. La portería no lo recibe:
   * los días los decide la vivienda.
   */
  onCambiarDias?: (dias: number[]) => void;
}

/**
 * Qué días viene un profesional permanente y cuándo vino de verdad.
 *
 * Antes solo quedaba la última entrada y la última salida: no había forma de
 * saber qué días había venido la empleada (13/10/2026). Cada vez que la
 * portería marca su entrada queda un renglón.
 */
export function AsistenciaDelPermanente({
  item,
  onCambiarDias,
}: AsistenciaDelPermanenteProps) {
  const jornadas = (item.jornadas ?? []).slice(0, ULTIMAS);
  const [editando, setEditando] = useState(false);
  const [dias, setDias] = useState<number[]>(item.diasTrabajo ?? []);

  const abrir = () => {
    setDias(item.diasTrabajo ?? []);
    setEditando(true);
  };

  return (
    <View className="rounded-xl bg-gray-50 p-3 gap-1.5">
      <Text className="text-xs font-semibold text-gray-500">
        Registro permanente
      </Text>

      {editando ? (
        <View className="gap-2.5">
          <DiasDeTrabajo dias={dias} onCambiar={setDias} />
          <View className="flex-row gap-2.5">
            <View className="flex-1">
              <Button
                variant="secondary"
                fullWidth
                onPress={() => setEditando(false)}
              >
                Cancelar
              </Button>
            </View>
            <View className="flex-1">
              <Button
                fullWidth
                disabled={!dias.length}
                onPress={() => {
                  onCambiarDias?.(dias);
                  setEditando(false);
                }}
              >
                Guardar días
              </Button>
            </View>
          </View>
        </View>
      ) : (
        <View className="flex-row items-center justify-between gap-3">
          <Text className="flex-1 text-sm text-gray-900">
            Viene: {textoDeDias(item.diasTrabajo)}
          </Text>
          {onCambiarDias ? (
            <Pressable
              onPress={abrir}
              accessibilityRole="button"
              accessibilityLabel="Cambiar los días en que viene"
              className="rounded-full border border-gray-200 px-2.5 py-1 active:opacity-70"
            >
              <Text className="text-xs text-gray-600">Cambiar días</Text>
            </Pressable>
          ) : null}
        </View>
      )}

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
