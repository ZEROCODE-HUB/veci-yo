import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCondominioActivo } from "@/shared/hooks";
import { useUIStore } from "@/stores/ui-store";
import type { PermisoVivienda } from "@/shared/types";
import { guardarPermisos, obtenerPermisos } from "../services/permisos.repo";

export const permisosQueryKey = ["administrador", "permisos"] as const;

/**
 * Lo que ve la pantalla mientras el condominio no haya configurado nada.
 * No se guarda solo: es el punto de partida del formulario.
 */
const PERMISOS_INICIALES: PermisoVivienda = {
  entregaDirecta: false,
  huespedesTemporales: false,
  diferenciaEstancia: false,
  estanciaCorta: {
    permiteVisitas: "No",
    permiteHuespedNinos: "Sí",
    permiteMascotas: "No",
    permiteCocherasVisit: "No",
    estanciaMinima: "1 dias",
    estanciaMaxima: "3 dias",
    horarioCheckin: "",
  },
  estanciaLarga: {
    permiteVisitas: "Sí",
    permiteHuespedNinos: "Sí",
    permiteMascotas: "No",
    permiteCocherasVisit: "No",
    estanciaMinima: "3 dias",
    horarioCheckin: "",
  },
};

export function useAdministradorPermisos() {
  const client = useQueryClient();
  const condominioId = useCondominioActivo() ?? "";
  const addToast = useUIStore((s) => s.addToast);

  const query = useQuery({
    queryKey: [...permisosQueryKey, condominioId],
    queryFn: () => obtenerPermisos(condominioId),
    enabled: Boolean(condominioId),
  });

  const guardar = useMutation({
    mutationFn: (datos: PermisoVivienda) => guardarPermisos(condominioId, datos),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: permisosQueryKey });
      addToast("Permisos actualizados", "success");
    },
    onError: (error) =>
      addToast(
        error instanceof Error ? error.message : "No se pudieron guardar",
        "error",
      ),
  });

  return {
    data: query.data ?? PERMISOS_INICIALES,
    cargando: query.isLoading,
    savePermisos: guardar.mutate,
    guardando: guardar.isPending,
  };
}
