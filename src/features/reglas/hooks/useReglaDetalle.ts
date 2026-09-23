import { useState } from "react";
import { Linking } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/stores";
import { useUIStore } from "@/stores/ui-store";
import { useCondominioActivo } from "@/shared/hooks";
import { elegirDocumento, type ArchivoElegido } from "@/shared/services/archivos";
import {
  obtenerReglamento,
  subirReglamento,
  TIPOS_REGLAMENTO,
  urlDelReglamento,
} from "../services/reglamentos.repo";
import type { TipoRegla } from "../types/reglas";

/**
 * El reglamento que se está leyendo, y su PDF.
 *
 * Salía de `reglasContenido.ts`, un archivo TypeScript con el texto dentro:
 * el mismo reglamento para todos los edificios, y para cambiar una línea había
 * que publicar la aplicación. Ahora es la fila de `reglamento` de ese
 * condominio, que es donde el KT lo quiere —el de renta corta es el que el RNT
 * exige presentar—.
 *
 * Y el archivo: `archivo_path` existía desde el primer día y estaba vacía en
 * todos los condominios porque nadie subía nada. "Elegir archivo" no tenía más
 * acción que cerrar el modal, y el botón de descarga abría un cartel con el
 * nombre de un PDF que no existía en ningún sitio.
 */
export function useReglaDetalle(tipo?: string) {
  const role = useAuthStore((state) => state.rolActivo);
  const condominioId = useCondominioActivo() ?? "";
  const client = useQueryClient();
  const addToast = useUIStore((s) => s.addToast);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [downloadOpen, setDownloadOpen] = useState(false);
  const [elegido, setElegido] = useState<ArchivoElegido | null>(null);

  const tipoRegla = (tipo as TipoRegla) || "residente-permanente";

  const { data, isLoading } = useQuery({
    queryKey: ["reglamento", condominioId, tipoRegla],
    queryFn: () => obtenerReglamento(condominioId, tipoRegla),
    enabled: Boolean(condominioId),
  });

  const avisar = (error: unknown, respaldo: string) =>
    addToast(error instanceof Error ? error.message : respaldo, "error");

  /** Abre el selector. El bucket no acepta imágenes: un reglamento es un documento. */
  const elegirArchivo = async () => {
    try {
      const archivo = await elegirDocumento(TIPOS_REGLAMENTO);
      if (archivo) setElegido(archivo);
    } catch (error) {
      avisar(error, "No se pudo abrir el selector de archivos");
    }
  };

  const subir = useMutation({
    mutationFn: () => {
      if (!elegido) throw new Error("Elegí un archivo primero.");
      return subirReglamento(condominioId, tipoRegla, elegido);
    },
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ["reglamento", condominioId] });
      addToast("Reglamento actualizado", "success");
      setElegido(null);
      setUploadOpen(false);
    },
    onError: (error) => avisar(error, "No se pudo subir el reglamento"),
  });

  /** Abre el PDF con una URL firmada: el bucket es privado. */
  const descargar = useMutation({
    mutationFn: async () => {
      if (!data?.file) throw new Error("Este reglamento no tiene archivo.");
      const url = await urlDelReglamento(data.file);
      await Linking.openURL(url);
    },
    onSuccess: () => setDownloadOpen(false),
    onError: (error) => avisar(error, "No se pudo abrir el reglamento"),
  });

  const cerrarCarga = () => {
    setElegido(null);
    setUploadOpen(false);
  };

  return {
    role,
    content: data ?? null,
    cargando: isLoading,
    uploadOpen,
    setUploadOpen,
    cerrarCarga,
    downloadOpen,
    setDownloadOpen,
    isTemporaryGuest: role === "huesped-temporal",
    // El reglamento del edificio lo pone la administración, igual que la
    // política de la tabla y la del bucket. El botón no se le ofrecía solo al
    // huésped temporal, así que cualquier residente lo veía y no funcionaba.
    puedeSubir: role === "administrador",
    elegido,
    elegirArchivo,
    subir,
    descargar,
  };
}
