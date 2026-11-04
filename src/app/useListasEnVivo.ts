import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/auth-store";
import { supabase } from "@/shared/services/supabase";

/**
 * Las listas del panel (`catalogo_opcion`) se ponen al día solas (Para Claude
 * 220 y 221, 04/11/2026).
 *
 * El cliente: al renombrar un cargo del equipo administrativo o un motivo
 * para eliminar la cuenta desde el panel, la app abierta seguía mostrando la
 * lista vieja --`useLista` la guarda diez minutos--. Ahora cualquier cambio en
 * la tabla hace que se vuelvan a pedir todas las listas, también la que está
 * abierta en un desplegable o en una ventana.
 */
export function useListasEnVivo() {
  const queryClient = useQueryClient();
  const conSesion = useAuthStore((s) => s.autenticado && s.modo === "cuenta");

  useEffect(() => {
    if (!conSesion) return;
    const canal = supabase
      .channel("listas-del-panel")
      .on("postgres_changes", { event: "*", schema: "public", table: "catalogo_opcion" }, () => {
        void queryClient.invalidateQueries({ queryKey: ["catalogo", "lista"] });
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(canal);
    };
  }, [conSesion, queryClient]);
}
