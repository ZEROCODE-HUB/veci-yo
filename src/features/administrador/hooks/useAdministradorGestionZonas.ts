import { useZonas } from "@/features/zonas/hooks";

/** Adaptador sobre `useZonas` para el panel de administracion de zonas. */
export function useAdministradorGestionZonas() {
  const {
    gestionZonas,
    cargando,
    agregarGestionZona,
    actualizarGestionZona,
    eliminarGestionZona,
    guardarZonaEntera,
  } = useZonas();

  return {
    data: gestionZonas,
    isLoading: cargando,
    guardarZonaEntera,
    saveZona: agregarGestionZona,
    updateZona: actualizarGestionZona,
    deleteZona: eliminarGestionZona,
  };
}
