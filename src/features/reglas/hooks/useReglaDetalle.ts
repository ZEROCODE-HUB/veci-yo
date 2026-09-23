import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/stores";
import { useCondominioActivo } from "@/shared/hooks";
import { obtenerReglamento } from "../services/reglamentos.repo";
import type { TipoRegla } from "../types/reglas";

/**
 * El reglamento que se está leyendo.
 *
 * Salía de `reglasContenido.ts`, un archivo TypeScript con el texto dentro:
 * el mismo reglamento para todos los edificios, y para cambiar una línea había
 * que publicar la aplicación. Ahora es la fila de `reglamento` de ese
 * condominio, que es donde el KT lo quiere —el de renta corta es el que el RNT
 * exige presentar—.
 */
export function useReglaDetalle(tipo?: string) {
  const role = useAuthStore((state) => state.rolActivo);
  const condominioId = useCondominioActivo() ?? "";
  const [uploadOpen, setUploadOpen] = useState(false);
  const [downloadOpen, setDownloadOpen] = useState(false);

  const tipoRegla = (tipo as TipoRegla) || "residente-permanente";

  const { data, isLoading } = useQuery({
    queryKey: ["reglamento", condominioId, tipoRegla],
    queryFn: () => obtenerReglamento(condominioId, tipoRegla),
    enabled: Boolean(condominioId),
  });

  return {
    role,
    content: data ?? null,
    cargando: isLoading,
    uploadOpen,
    setUploadOpen,
    downloadOpen,
    setDownloadOpen,
    isTemporaryGuest: role === "huesped-temporal",
  };
}
