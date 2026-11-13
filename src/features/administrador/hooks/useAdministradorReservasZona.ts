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
    estadoZonas,
    estadoReservas,
    actualizarEstadoReservaAsync,
    resolviendoReserva,
    actualizarReservaAsync,
    guardandoReserva,
    eliminarReservaAsync,
    cancelandoReserva,
    actualizarPersonaReserva,
  } = useZonas();

  /*
    Esperan y dicen si salió (13/11/2026): las ventanas cerraban al pulsar y
    el botón no daba señal, así que un segundo toque mandaba otra vez lo
    mismo. El motivo de un fallo ya lo enseña `useZonas`.
  */
  const salio = (promesa: Promise<unknown>) => promesa.then(() => true, () => false);

  const data = useMemo(
    () => reservas.filter((item) => item.zonaId === zonaId),
    [reservas, zonaId],
  );

  return {
    data,
    isLoading: cargando,
    /** La zona y sus reservas: sin las dos, la pantalla no puede decir «no hay». */
    estadoZona: estadoZonas,
    estado: estadoReservas,
    updateEstado: (reservaUuid: string, estado: string, motivoRechazo?: string) =>
      salio(actualizarEstadoReservaAsync(reservaUuid, estado, motivoRechazo)),
    /** La reserva que se está aprobando, rechazando o cancelando. */
    resolviendo: resolviendoReserva,
    updateReserva: (reservaUuid: string, datos: Parameters<typeof actualizarReservaAsync>[1]) =>
      salio(actualizarReservaAsync(reservaUuid, datos)),
    guardando: guardandoReserva,
    deleteReserva: (reservaUuid: string) => salio(eliminarReservaAsync(reservaUuid)),
    eliminando: cancelandoReserva,
    updateParticipante: actualizarPersonaReserva,
  };
}
