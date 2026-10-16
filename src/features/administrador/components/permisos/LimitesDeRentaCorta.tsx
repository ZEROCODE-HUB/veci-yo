import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Input } from "@/shared/components/ui";
import { useUIStore } from "@/stores";
import { mensajeDeError } from "@/shared/utils";
import {
  guardarLimitesRentaCorta,
  obtenerLimitesRentaCorta,
} from "../../services/condominio.repo";

/**
 * Las noches mínimas y el aforo máximo que el edificio pide a la renta corta.
 *
 * Decisión del cliente del 29/09/2026 (punto 62): el límite de noches es del
 * edificio. El anfitrión lo ve como advertencia al configurar su vivienda
 * --no lo bloquea, KT 4.1--. La tabla existía y nadie la podía escribir
 * (16/10/2026).
 */
export function LimitesDeRentaCorta({ condominioId }: { condominioId: string }) {
  const cliente = useQueryClient();
  const addToast = useUIStore((s) => s.addToast);

  const guardados = useQuery({
    queryKey: ["condominio", "limites-renta-corta", condominioId],
    queryFn: () => obtenerLimitesRentaCorta(condominioId),
    enabled: Boolean(condominioId),
  });

  const [noches, setNoches] = useState("");
  const [aforo, setAforo] = useState("");

  useEffect(() => {
    if (!guardados.data) return;
    setNoches(guardados.data.estanciaMinimaNoches?.toString() ?? "");
    setAforo(guardados.data.capacidadMaxima?.toString() ?? "");
  }, [guardados.data]);

  const guardar = useMutation({
    mutationFn: () =>
      guardarLimitesRentaCorta(condominioId, {
        estanciaMinimaNoches: Number(noches) || null,
        capacidadMaxima: Number(aforo) || null,
      }),
    onSuccess: () => {
      addToast("Límites de renta corta guardados", "success");
      void cliente.invalidateQueries({ queryKey: ["condominio", "limites-renta-corta"] });
    },
    onError: (fallo) =>
      addToast(mensajeDeError(fallo, "No se pudo guardar"), "error"),
  });

  const soloCifras = (texto: string) => texto.replace(/[^0-9]/g, "");

  return (
    <View className="gap-3">
      <Text className="text-sm font-semibold text-gray-900">
        Límites del edificio
      </Text>
      <View className="flex-row gap-2.5">
        <View className="flex-1">
          <Input
            label="Noches mínimas"
            value={noches}
            onChangeText={(texto) => setNoches(soloCifras(texto))}
            placeholder="Sin mínimo"
            type="numeric"
            showEditIcon={false}
          />
        </View>
        <View className="flex-1">
          <Input
            label="Personas máximas"
            value={aforo}
            onChangeText={(texto) => setAforo(soloCifras(texto))}
            placeholder="Sin máximo"
            type="numeric"
            showEditIcon={false}
          />
        </View>
      </View>
      <Text className="text-xs leading-5 text-gray-500">
        Por vivienda. El anfitrión los ve como aviso al configurar su
        alojamiento; vacío, el edificio no pide nada.
      </Text>
      <Button
        fullWidth
        variant="secondary"
        loading={guardar.isPending}
        disabled={guardados.isLoading || guardados.isError}
        onPress={() => guardar.mutate()}
      >
        Guardar límites
      </Button>
    </View>
  );
}
