import React, { useState } from "react";
import { Text, View } from "react-native";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button, Modal } from "@/shared/components";
import { useUIStore } from "@/stores";
import { mensajeDeError } from "@/shared/utils";
import type { VisitaItem } from "@/shared/types";
import { terminarEstancia } from "../services/visitas.repo";
import { VISITAS_QUERY_KEY } from "../hooks/useVisitas";

/**
 * «Terminar estancia» del anfitrión (23/10/2026).
 *
 * Desde ese día la estancia ya no se cierra cuando salen todos: salir a cenar
 * no es irse. Termina sola en su día de salida, o antes si el anfitrión lo
 * dice aquí. Solo se ofrece cuando ya entró alguien: si nadie llegó, lo que
 * toca es cancelarla.
 */
export function TerminarEstancia({ visita }: { visita: VisitaItem }) {
  const [preguntando, setPreguntando] = useState(false);
  const client = useQueryClient();
  const addToast = useUIStore((s) => s.addToast);
  const terminar = useMutation({
    mutationFn: terminarEstancia,
    onSuccess: () => {
      setPreguntando(false);
      void client.invalidateQueries({ queryKey: VISITAS_QUERY_KEY });
      addToast("Estancia terminada", "success");
    },
    onError: (e) => addToast(mensajeDeError(e, "No se pudo terminar la estancia"), "error"),
  });

  if (!visita.uuid || visita.estado !== "Ingresado") return null;
  const uuid = visita.uuid;

  return (
    <>
      <Button variant="secondary" fullWidth onPress={() => setPreguntando(true)}>
        Terminar estancia
      </Button>
      <Text className="text-xs text-gray-500 text-center">
        Si no la terminas, termina sola el {visita.fechaHasta}. Salir un rato del edificio
        no la termina.
      </Text>
      <Modal visible={preguntando} onClose={() => setPreguntando(false)} title="Terminar estancia">
        <View className="gap-4">
          <Text className="text-sm text-gray-700">
            Quien siga dentro queda con la salida marcada ahora, el QR deja de servir y se suelta
            el estacionamiento. No se puede deshacer.
          </Text>
          <View className="flex-row gap-3">
            <View className="flex-1">
              <Button variant="secondary" fullWidth onPress={() => setPreguntando(false)}>
                Volver
              </Button>
            </View>
            <View className="flex-1">
              <Button
                variant="danger"
                fullWidth
                loading={terminar.isPending}
                onPress={() => terminar.mutate(uuid)}
              >
                Terminar
              </Button>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}
