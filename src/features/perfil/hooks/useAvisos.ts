import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useUIStore } from "@/stores";
import {
  guardarPreferenciaDeAviso,
  obtenerPreferenciasDeAviso,
  type PreferenciaDeAviso,
} from "@/features/home/services/notificaciones.repo";

export const AVISOS_QUERY_KEY = ["perfil", "avisos"];

/**
 * Por dónde quiere esta persona que le avisen de cada cosa.
 *
 * Pedido por el cliente el 02/10/2026. La lista de motivos la da la base
 * --`avisos_de_cada_uno` recorre el enum-- para que añadir un motivo nuevo no
 * obligue a tocar la pantalla, y para que la pantalla no tenga que saber los
 * valores por defecto.
 */
export function useAvisos() {
  const queryClient = useQueryClient();
  const addToast = useUIStore((s) => s.addToast);

  const query = useQuery({
    queryKey: AVISOS_QUERY_KEY,
    queryFn: obtenerPreferenciasDeAviso,
  });

  const guardar = useMutation({
    mutationFn: (aviso: PreferenciaDeAviso) =>
      guardarPreferenciaDeAviso({
        motivo: aviso.motivo,
        porApp: aviso.porApp,
        porCorreo: aviso.porCorreo,
        porWhatsapp: aviso.porWhatsapp,
      }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: AVISOS_QUERY_KEY }),
    /*
      El motivo, no un texto genérico. La base dice «Para recibir avisos por
      WhatsApp hace falta un teléfono en el perfil», y eso se arregla sabiéndolo:
      sin el mensaje, el interruptor se niega a encenderse sin explicar nada.
    */
    onError: (error: Error) => addToast(error.message, "error"),
  });

  return {
    avisos: query.data ?? [],
    cargando: query.isLoading,
    guardar: (aviso: PreferenciaDeAviso) => guardar.mutate(aviso),
  };
}
