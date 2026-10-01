import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useCondominioActivo } from "@/shared/hooks";
import { useUIStore } from "@/stores/ui-store";
import { reporteAArchivo } from "../services/reporteArchivo";
import {
  generarReporte,
  type ResultadoReporte,
  type SolicitudReporte,
} from "../services/reportes.repo";

export function useAdministradorReportes() {
  const condominioId = useCondominioActivo() ?? "";
  const addToast = useUIStore((s) => s.addToast);
  const [resultado, setResultado] = useState<ResultadoReporte | null>(null);
  /** La solicitud que produjo `resultado`: hace falta para nombrar el Excel. */
  const [solicitud, setSolicitud] = useState<SolicitudReporte | null>(null);

  const mutation = useMutation({
    mutationFn: (datos: Omit<SolicitudReporte, "condominioId">) =>
      generarReporte({ ...datos, condominioId }),
    onSuccess: (res, datos) => {
      setResultado(res);
      setSolicitud({ ...datos, condominioId });
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

  /**
   * El reporte, como archivo de Excel.
   *
   * La pantalla enseñaba cuántos registros había y ahí se acababa: no había
   * forma de leerlos (R-33). El aviso lo achacaba al proveedor de correo, y
   * eran dos cosas distintas --un archivo no depende del correo--.
   */
  const exportar = useMutation({
    mutationFn: async () => {
      if (!resultado || !solicitud) throw new Error("No hay reporte generado");
      return reporteAArchivo(solicitud, resultado);
    },
    onSuccess: ({ nombre, compartido }) => {
      addToast(
        compartido ? "Reporte listo para guardar o enviar" : `Descargado: ${nombre}`,
        "success",
      );
    },
    onError: (error) =>
      addToast(
        error instanceof Error ? error.message : "No se pudo crear el archivo",
        "error",
      ),
  });

  return {
    generateReport: mutation.mutate,
    generating: mutation.isPending,
    /** Filas reales del reporte; null mientras no se haya generado ninguno. */
    resultado,
    limpiarResultado: () => {
      setResultado(null);
      setSolicitud(null);
    },
    exportarExcel: () => exportar.mutate(),
    exportando: exportar.isPending,
  };
}
