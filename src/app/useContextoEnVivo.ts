import { useEffect } from "react";
import { AppState } from "react-native";
import { useAuthStore } from "@/stores/auth-store";
import { supabase } from "@/shared/services/supabase";

/** Por si el aviso en vivo no llega (sin conexión un rato): se vuelve a leer. */
const CADA_MS = 60_000;

/**
 * Los edificios, viviendas y roles de la persona se ponen al día solos
 * (29/10/2026).
 *
 * El cliente: al asignarle un edificio desde el panel, la app abierta no se
 * enteraba hasta cerrarla. Las membresías viven en el store de la sesión, no
 * en una consulta, así que nada las volvía a leer salvo la renovación del
 * token (una vez por hora). Ahora se releen cuando cambia una membresía suya
 * (Realtime), al volver la app a primer plano, y cada minuto por si acaso.
 */
export function useContextoEnVivo() {
  const usuarioId = useAuthStore((s) => (s.modo === "cuenta" ? s.usuarioId : null));

  useEffect(() => {
    if (!usuarioId) return;
    const releer = () => {
      void useAuthStore.getState().refrescarContexto().catch(() => undefined);
    };

    const canal = supabase
      .channel(`contexto-${usuarioId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "membresia_condominio", filter: `usuario_id=eq.${usuarioId}` },
        releer,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "membresia_unidad", filter: `usuario_id=eq.${usuarioId}` },
        releer,
      )
      .subscribe();

    const alVolver = AppState.addEventListener("change", (estado) => {
      if (estado === "active") releer();
    });
    const intervalo = setInterval(releer, CADA_MS);

    return () => {
      void supabase.removeChannel(canal);
      alVolver.remove();
      clearInterval(intervalo);
    };
  }, [usuarioId]);
}
