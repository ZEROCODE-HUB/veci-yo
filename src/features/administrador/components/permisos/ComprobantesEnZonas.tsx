import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Text, View } from "react-native";
import { SegunLaCarga, Toggle, estadoDe } from "@/shared/components";
import { useUIStore } from "@/stores";
import {
  guardarComprobantesEnZonas,
  sePidenComprobantes,
} from "@/features/zonas/services/zonas.repo";

/**
 * «Permitir subir comprobantes de pago en Zonas Comunes» (Para Claude 202,
 * 01/11/2026). Encendido, quien reserva una zona de pago tiene que adjuntar el
 * comprobante; apagado, no se pide ni se enseña.
 */
export function ComprobantesEnZonas({ condominioId }: { condominioId: string }) {
  const cliente = useQueryClient();
  const { addToast } = useUIStore();

  const consulta = useQuery({
    queryKey: ["comprobantes-en-zonas", condominioId],
    queryFn: () => sePidenComprobantes(condominioId),
    enabled: Boolean(condominioId),
  });
  const permitir = consulta.data;

  const guardar = useMutation({
    mutationFn: (valor: boolean) => guardarComprobantesEnZonas(condominioId, valor),
    onSuccess: () => {
      addToast("Guardado", "success");
      cliente.invalidateQueries({ queryKey: ["comprobantes-en-zonas", condominioId] });
    },
    onError: (e: Error) => addToast(e.message, "error"),
  });

  return (
    // Apagado mientras cargaba se leía como «no se pide» (13/11/2026).
    <SegunLaCarga estado={estadoDe(consulta)} texto="la opción de comprobantes" enLinea>
    <View className="gap-2">
      <Toggle
        value={Boolean(permitir)}
        disabled={permitir === undefined}
        cargando={guardar.isPending}
        onChange={(valor) => guardar.mutate(valor)}
        labelRight="Permitir subir comprobantes de pago en Zonas Comunes"
      />
      <Text className="text-xs leading-5 text-gray-500">
        {permitir
          ? "Al reservar una zona de pago se pide adjuntar el comprobante: sin él no se puede enviar la reserva."
          : "Al reservar no se pide comprobante de pago."}
      </Text>
    </View>
    </SegunLaCarga>
  );
}
