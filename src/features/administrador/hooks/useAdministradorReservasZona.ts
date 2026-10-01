import { useMemo } from "react";
import { useZonas } from "@/features/zonas/hooks";

/**
 * Vista de administracion de las reservas de UNA zona.
 *
 * Es un adaptador sobre `useZonas`, no una cache aparte: antes cada hook de
 * administrador mantenia su propia consulta contra el store, con varias copias
 * del mismo dato que podian quedar desincronizadas.
 */
export function useAdministradorReservasZona(zonaId: string) {
  const {
    reservas,
    cargando,
    actualizarEstadoReserva,
    actualizarReserva,
    eliminarReserva,
    actualizarPersonaReserva,
  } = useZonas();

  const data = useMemo(
    () => reservas.filter((item) => item.zonaId === zonaId),
    [reservas, zonaId],
  );

  return {
    data,
    isLoading: cargando,
    updateEstado: actualizarEstadoReserva,
    updateReserva: actualizarReserva,
    deleteReserva: eliminarReserva,
    updateParticipante: actualizarPersonaReserva,
  };
}
