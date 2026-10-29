import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  contarSinLeer,
  marcarNotificacionLeida,
  marcarTodasLeidas,
  obtenerNotificaciones,
} from "../services/notificaciones.repo";
import { useAuthStore, useUIStore } from "@/stores";
import { esParaElRol } from "@/shared/utils/audienciaPorRol";
import type { Notificacion } from "../types/home";

/*
  Los avisos de un anuncio o una encuesta solo con el rol al que iban
  (Para Claude 157, 29/10/2026): con varios roles, el de la portería no tiene
  que salirle a quien entra como propietario.
*/
function soloLosDeMiRol(lista: Notificacion[], rol: Parameters<typeof esParaElRol>[1]) {
  return lista.filter((n) => !n.audiencia || esParaElRol(n.audiencia, rol));
}
import { mensajeDeError } from "@/shared/utils";

/**
 * Bandeja del usuario en sesión.
 *
 * Ya no hay un rol de notificaciones: la bandeja es de la persona. El rol
 * decidía antes qué lista fija se mostraba, y con eso una misma cuenta veía
 * avisos distintos según con qué rol hubiera entrado, aunque los hechos fueran
 * los mismos.
 */
export function useNotificaciones() {
  const queryClient = useQueryClient();
  const refrescar = () =>
    queryClient.invalidateQueries({ queryKey: ["notificaciones"] });

  const query = useQuery({
    queryKey: ["notificaciones"],
    queryFn: obtenerNotificaciones,
  });

  const addToast = useUIStore((s) => s.addToast);
  // Las dos fallaban en silencio: el aviso seguía sin leer y nadie decía por
  // qué (13/10/2026).
  const alFallar = (fallo: unknown) =>
    addToast(mensajeDeError(fallo, "No se pudo marcar como leída"), "error");

  const marcar = useMutation({
    mutationFn: marcarNotificacionLeida,
    onSuccess: refrescar,
    onError: alFallar,
  });

  const marcarTodas = useMutation({
    mutationFn: marcarTodasLeidas,
    onSuccess: refrescar,
    onError: alFallar,
  });

  const rolActivo = useAuthStore((s) => s.rolActivo);
  return {
    ...query,
    notificaciones: soloLosDeMiRol(query.data ?? [], rolActivo),
    marcarLeida: (id: string) => marcar.mutate(id),
    marcarTodasLeidas: () => marcarTodas.mutate(),
  };
}

/** Contador de la campana de la barra superior. */
export function useNotificacionesSinLeer() {
  const rolActivo = useAuthStore((s) => s.rolActivo);
  const { data: total } = useQuery({
    queryKey: ["notificaciones", "sin-leer"],
    queryFn: contarSinLeer,
  });
  // Lo que se le esconde con este rol no cuenta en la campana.
  const { data: lista } = useQuery({
    queryKey: ["notificaciones"],
    queryFn: obtenerNotificaciones,
  });
  if (!lista) return total ?? 0;
  const escondidas = lista.filter((n) => !n.leida && n.audiencia && !esParaElRol(n.audiencia, rolActivo)).length;
  return Math.max((total ?? 0) - escondidas, 0);
}
