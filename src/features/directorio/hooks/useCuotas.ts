import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCondominioActivo } from "@/shared/hooks";
import { useUIStore } from "@/stores/ui-store";
import {
  marcarPago,
  marcarPagosMasivo,
  obtenerPagos,
  obtenerPeriodos,
} from "../services/cuotas.repo";

/**
 * El registro de pagos de la cuota de administración (KT flujo 4.6).
 *
 * Las dos vías que pide el KT —la casilla por vivienda y la carga masiva—
 * escriben ahora en `pago_cuota`. Antes la primera guardaba en un store de
 * Zustand y la segunda era un `delay(200)`.
 *
 * El periodo importa y antes no existía: marcar "pagado" sin decir de qué mes
 * no significa nada, y el Cuadro de Honor cuenta por periodo.
 */
export function useCuotas() {
  const condominioId = useCondominioActivo() ?? "";
  const queryClient = useQueryClient();
  const addToast = useUIStore((s) => s.addToast);
  const [cuotaId, setCuotaId] = useState("");

  const periodos = useQuery({
    queryKey: ["cuotas", "periodos", condominioId],
    queryFn: () => obtenerPeriodos(condominioId),
    enabled: Boolean(condominioId),
  });

  // El más reciente, mientras no se elija otro.
  useEffect(() => {
    if (!cuotaId && periodos.data?.length) setCuotaId(periodos.data[0].id);
  }, [cuotaId, periodos.data]);

  const pagos = useQuery({
    queryKey: ["cuotas", "pagos", cuotaId],
    queryFn: () => obtenerPagos(cuotaId),
    enabled: Boolean(cuotaId),
  });

  const invalidar = () => {
    void queryClient.invalidateQueries({ queryKey: ["cuotas", "pagos"] });
    // El Cuadro de Honor cuenta a partir de estos pagos.
    void queryClient.invalidateQueries({ queryKey: ["cuadro-honor"] });
  };

  const marcar = useMutation({
    mutationFn: (datos: { unidadId: string; pagado: boolean }) =>
      marcarPago({ cuotaId, ...datos }),
    onSuccess: invalidar,
    onError: () => addToast("No se pudo registrar el pago", "error"),
  });

  const masivo = useMutation({
    mutationFn: (codigos: string[]) => marcarPagosMasivo({ cuotaId, codigos }),
    onSuccess: (resultado) => {
      invalidar();
      // Se dice lo que se registró, no lo que traía el archivo.
      addToast(
        resultado.noEncontradas.length === 0
          ? `${resultado.marcadas} vivienda(s) marcadas como pagadas`
          : `${resultado.marcadas} marcadas. No se encontraron: ${resultado.noEncontradas.join(", ")}`,
        resultado.noEncontradas.length === 0 ? "success" : "info",
      );
    },
    onError: () => addToast("No se pudo cargar el archivo", "error"),
  });

  const pagadas = new Set(
    (pagos.data ?? []).filter((p) => p.pagado).map((p) => p.unidadId),
  );

  return {
    periodos: periodos.data ?? [],
    cuotaId,
    setCuotaId,
    /** Los uuid de las viviendas al día en el periodo elegido. */
    pagadas,
    estaPagada: (unidadId: string) => pagadas.has(unidadId),
    marcar: (unidadId: string, pagado: boolean) =>
      marcar.mutate({ unidadId, pagado }),
    marcarMasivo: (codigos: string[]) => masivo.mutate(codigos),
    registrando: marcar.isPending || masivo.isPending,
  };
}
