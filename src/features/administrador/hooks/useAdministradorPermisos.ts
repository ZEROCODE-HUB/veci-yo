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
    permiteVisitas: false,
    permiteHuespedNinos: true,
    permiteMascotas: false,
    permiteCocherasVisit: false,
    estanciaMinima: 1,
    estanciaMaxima: 3,
    horarioCheckin: "",
  },
  estanciaLarga: {
    permiteVisitas: true,
    permiteHuespedNinos: true,
    permiteMascotas: false,
    permiteCocherasVisit: false,
    estanciaMinima: 3,
    estanciaMaxima: null,
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
