import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useCondominioActivo } from "@/shared/hooks";
import { useUIStore } from "@/stores/ui-store";
import {
  generarReporte,
  type ResultadoReporte,
  type SolicitudReporte,
} from "../services/reportes.repo";

export function useAdministradorReportes() {
  const condominioId = useCondominioActivo() ?? "";
  const addToast = useUIStore((s) => s.addToast);
  const [resultado, setResultado] = useState<ResultadoReporte | null>(null);

  const mutation = useMutation({
    mutationFn: (datos: Omit<SolicitudReporte, "condominioId">) =>
      generarReporte({ ...datos, condominioId }),
    onSuccess: (res) => {
      setResultado(res);
      if (res.total === 0) {
        addToast("El reporte no devolvió resultados en ese rango", "info");
      }
    },
    onError: (error) =>
      addToast(
        error instanceof Error
          ? error.message
          : "No se pudo generar el reporte",
        "error",
      ),
  });

  return {
    generateReport: mutation.mutate,
    generating: mutation.isPending,
    /** Filas reales del reporte; null mientras no se haya generado ninguno. */
    resultado,
    limpiarResultado: () => setResultado(null),
  };
}
