import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Text, View } from "react-native";
import { Toggle } from "@/shared/components";
import { useUIStore } from "@/stores";
import {
  cuadroHonorCuentaMesEnCurso,
  guardarCuadroHonorMesEnCurso,
} from "@/features/inquilino-lider/services/cuadroHonor.repo";

/**
 * Si el Cuadro de Honor cuenta el mes en curso (hueco 53, 27/10/2026).
 *
 * Al empezar un mes nadie lo ha pagado todavía, y contándolo el cuadro sale
 * vacío hasta que se marcan pagos. Apagado, cuenta solo los meses vencidos.
 * Lo pidió el cliente así: que lo decida la administración de cada edificio.
 */
export function MesDelCuadroDeHonor({ condominioId }: { condominioId: string }) {
  const cliente = useQueryClient();
  const { addToast } = useUIStore();

  const { data: cuenta } = useQuery({
    queryKey: ["cuadro-honor-mes-en-curso", condominioId],
    queryFn: () => cuadroHonorCuentaMesEnCurso(condominioId),
    enabled: Boolean(condominioId),
  });

  const guardar = useMutation({
    mutationFn: (valor: boolean) => guardarCuadroHonorMesEnCurso(condominioId, valor),
    onSuccess: () => {
      addToast("Guardado", "success");
      cliente.invalidateQueries({ queryKey: ["cuadro-honor-mes-en-curso", condominioId] });
      cliente.invalidateQueries({ queryKey: ["cuadro-honor"] });
    },
    onError: (e: Error) => addToast(e.message, "error"),
  });

  return (
    <View className="gap-2">
      <Toggle
        value={Boolean(cuenta)}
        disabled={guardar.isPending || cuenta === undefined}
        onChange={(valor) => guardar.mutate(valor)}
        labelRight="El Cuadro de Honor cuenta el mes en curso"
      />
      <Text className="text-xs leading-5 text-gray-500">
        {cuenta
          ? "Cuenta también el mes que corre: al empezar el mes saldrá casi vacío hasta que se marquen pagos."
          : "Cuenta solo los meses ya vencidos: quien pagó a tiempo no desaparece al empezar el mes."}
      </Text>
    </View>
  );
}
