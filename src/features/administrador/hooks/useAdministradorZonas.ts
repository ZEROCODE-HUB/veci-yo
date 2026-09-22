import { useZonas } from "@/features/zonas/hooks";

export const administradorZonasQueryKey = ["zonas"] as const;

/** Adaptador sobre `useZonas` para la configuracion de zonas comunes. */
export function useAdministradorZonas() {
  const {
    zonasComunesConfig,
    cargando,
    agregarZonaComun,
    actualizarZonaComun,
    eliminarZonaComun,
  } = useZonas();

  return {
    data: zonasComunesConfig,
    isLoading: cargando,
    saveZona: agregarZonaComun,
    updateZona: actualizarZonaComun,
    deleteZona: eliminarZonaComun,
  };
}
