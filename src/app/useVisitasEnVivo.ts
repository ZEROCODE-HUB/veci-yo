import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/auth-store";
import { supabase } from "@/shared/services/supabase";

/** Las tablas que mueven las pantallas de la portería. */
const TABLAS = [
  "visita",
  "invitado",
  "verificacion_documento",
  "vehiculo_visita",
  "asignacion_estacionamiento",
] as const;

/** Varios cambios seguidos (una llegada toca visita e invitado) se juntan en uno. */
const ESPERA_MS = 800;

/**
 * La portería y la administración ven las visitas al momento (09/11/2026,
 * Correcciones fila 20).
 *
 * Al cambiar una visita, un invitado, su verificación, un vehículo o un
 * estacionamiento, se vuelven a pedir las visitas, el inicio y la
 * arquitectura (los lugares libres). No se lee lo que llega --un borrado
 * llega sin pasar por RLS--: solo avisa de que hay algo nuevo, y lo nuevo se
 * pide por el camino de siempre.
 */
export function useVisitasEnVivo() {
  const queryClient = useQueryClient();
  const rolActivo = useAuthStore((s) => s.rolActivo);
  const conSesion = useAuthStore((s) => s.autenticado && s.modo === "cuenta");
  const delPersonal = rolActivo === "guardia" || rolActivo === "administrador";
  const pendiente = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!conSesion || !delPersonal) return;
    const refrescar = () => {
      if (pendiente.current) return;
      pendiente.current = setTimeout(() => {
        pendiente.current = null;
        void queryClient.invalidateQueries({ queryKey: ["visitas"] });
        void queryClient.invalidateQueries({ queryKey: ["home"] });
        void queryClient.invalidateQueries({ queryKey: ["condominio", "arquitectura"] });
        void queryClient.invalidateQueries({ queryKey: ["directorio", "vehiculos"] });
      }, ESPERA_MS);
    };
    let canal = supabase.channel(`visitas-en-vivo-${Math.random().toString(36).slice(2)}`);
    for (const tabla of TABLAS) {
      canal = canal.on("postgres_changes", { event: "*", schema: "public", table: tabla }, refrescar);
    }
    canal.subscribe();
    return () => {
      if (pendiente.current) clearTimeout(pendiente.current);
      pendiente.current = null;
      void supabase.removeChannel(canal);
    };
  }, [conSesion, delPersonal, queryClient]);
}
