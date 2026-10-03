import { theme } from "@/config";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pressable, Text, View } from "react-native";
import { useUIStore } from "@/stores";
import {
  guardarVisibilidadCuotas,
  obtenerVisibilidadCuotas,
  type VisibilidadCuotas,
} from "@/features/inquilino-lider/services/cuadroHonor.repo";

/**
 * Qué se publica a los vecinos del estado de las cuotas.
 *
 * Lo pidió el cliente el 02/10/2026: que el porcentaje de cuotas sea
 * parametrizable —quién pagó, quién no, o solo el porcentaje—.
 *
 * No es una preferencia de pantalla. Publicar quién debe, en un edificio
 * pequeño, es señalar a un vecino por su nombre en la puerta: hay
 * administraciones que lo hacen y otras que no quieren ni oírlo, y ninguna de
 * las dos posturas se puede decidir desde aquí. Por eso lo elige quien
 * responde por el edificio y la base lo obedece —la lista de morosos no sale
 * siquiera en la respuesta—.
 *
 * La administración lo ve todo pase lo que pase: es quien cobra, y ocultárselo
 * no protegería a nadie.
 */

const OPCIONES: { valor: VisibilidadCuotas; titulo: string; detalle: string }[] = [
  {
    valor: "porcentaje",
    titulo: "Solo el porcentaje",
    detalle: "Cuánto se ha recaudado este mes, sin nombres. Lo más discreto.",
  },
  {
    valor: "quien_pago",
    titulo: "Quién está al día",
    detalle:
      "Además, los nombres de quienes ya pagaron. Quien debe no aparece de ninguna forma.",
  },
  {
    valor: "quien_debe",
    titulo: "Quién está al día y quién debe",
    detalle:
      "La lista completa, con los nombres de quienes no han pagado. Piénsalo: es público para todo el edificio.",
  },
];

export function VisibilidadDeCuotas({ condominioId }: { condominioId: string }) {
  const cliente = useQueryClient();
  const { addToast } = useUIStore();

  const { data: elegida } = useQuery({
    queryKey: ["visibilidad-cuotas", condominioId],
    queryFn: () => obtenerVisibilidadCuotas(condominioId),
    enabled: Boolean(condominioId),
  });

  const guardar = useMutation({
    mutationFn: (valor: VisibilidadCuotas) =>
      guardarVisibilidadCuotas(condominioId, valor),
    onSuccess: () => {
      addToast("Guardado", "success");
      cliente.invalidateQueries({ queryKey: ["visibilidad-cuotas", condominioId] });
      cliente.invalidateQueries({ queryKey: ["detalle-cuotas", condominioId] });
    },
    // El motivo lo escribe la base para que se lea. Cambiarlo por uno propio
    // es lo que dejó al cliente sin saber por qué fallaba el preregistro.
    onError: (e: Error) => addToast(e.message, "error"),
  });

  return (
    <View className="gap-2.5">
      <Text className="text-xs leading-5 text-gray-500">
        Lo que los vecinos ven del estado de las cuotas. Tú lo ves todo siempre.
      </Text>

      {OPCIONES.map((opcion) => {
        const puesta = elegida === opcion.valor;
        return (
          <Pressable
            key={opcion.valor}
            accessibilityRole="radio"
            accessibilityLabel={opcion.titulo}
            /*
              Los dos: react-native-web no traduce `accessibilityState` a
              ningún atributo del DOM, así que sin `aria-checked` el estado
              solo existiría en el color. Está documentado en `Checkbox.tsx` y
              ya mordió dos veces.
            */
            aria-checked={puesta}
            accessibilityState={{ checked: puesta }}
            disabled={guardar.isPending}
            onPress={() => guardar.mutate(opcion.valor)}
            className="rounded-xl border p-3"
            style={{
              borderColor: puesta ? theme.colors.primary : theme.colors.borderLight,
              backgroundColor: puesta ? theme.colors.primaryLight : theme.colors.bgCard,
            }}
          >
            <Text className="text-sm font-bold text-gray-900">
              {puesta ? "● " : "○ "}
              {opcion.titulo}
            </Text>
            <Text className="mt-0.5 text-xs leading-5 text-gray-500">
              {opcion.detalle}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
