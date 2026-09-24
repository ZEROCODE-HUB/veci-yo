import { Linking } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/auth-store";
import { useUIStore } from "@/stores";
import {
  urlTemporal,
  type ArchivoElegido,
} from "@/shared/services/archivos";
import {
  elegirDocumento,
  elegirImagen,
} from "@/shared/services/elegir-archivo";
import {
  adjuntarAReclamo,
  obtenerAdjuntos,
  quitarAdjunto,
  BUCKET_PQRS,
  type AdjuntoReclamo,
} from "../services";

export function useAdjuntosReclamo(reclamoId: string) {
  const queryClient = useQueryClient();
  const usuarioId = useAuthStore((s) => s.usuarioId ?? "");
  const addToast = useUIStore((s) => s.addToast);

  const clave = ["perfil", "reclamos", reclamoId, "adjuntos"];
  const refrescar = () => queryClient.invalidateQueries({ queryKey: clave });

  const query = useQuery({
    queryKey: clave,
    queryFn: () => obtenerAdjuntos(reclamoId),
    enabled: Boolean(reclamoId),
  });

  const subir = useMutation({
    mutationFn: (archivo: ArchivoElegido) =>
      adjuntarAReclamo({ reclamoId, archivo, usuarioId }),
    onSuccess: () => {
      addToast("Archivo adjuntado", "success");
      refrescar();
    },
    onError: (error: Error) => addToast(error.message, "error"),
  });

  const borrar = useMutation({
    mutationFn: quitarAdjunto,
    onSuccess: () => {
      addToast("Archivo eliminado", "success");
      refrescar();
    },
    onError: (error: Error) => addToast(error.message, "error"),
  });

  // Elegir puede fallar por permisos; cancelar no es un error.
  const elegirYSubir = async (elegir: () => Promise<ArchivoElegido | null>) => {
    try {
      const archivo = await elegir();
      if (archivo) subir.mutate(archivo);
    } catch (error) {
      addToast((error as Error).message, "error");
    }
  };

  return {
    adjuntos: query.data ?? [],
    cargando: query.isLoading,
    subiendo: subir.isPending,
    agregarDocumento: () => elegirYSubir(elegirDocumento),
    agregarImagen: () => elegirYSubir(elegirImagen),
    quitar: (adjunto: AdjuntoReclamo) => borrar.mutate(adjunto),
    // El bucket es privado: para verlo hace falta una URL firmada.
    abrir: async (adjunto: AdjuntoReclamo) => {
      try {
        const url = await urlTemporal({
          bucket: BUCKET_PQRS,
          ruta: adjunto.ruta,
        });
        await Linking.openURL(url);
      } catch (error) {
        addToast((error as Error).message, "error");
      }
    },
  };
}
