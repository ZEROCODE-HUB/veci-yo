import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useUIStore, useUbicacionStore } from "@/stores";
import { estadoDe } from "@/shared/components";
import { mensajeDeError } from "@/shared/utils/error.util";
import {
  cambiarPermisosDeTrabajador,
  darDeBajaTrabajador,
  invitarTrabajador,
  obtenerSituacionDeTrabajadores,
  obtenerTrabajadores,
  type PermisosDeTrabajador,
} from "../services/trabajadores.repo";

/**
 * Los profesionales permanentes de la vivienda activa (17/11/2026): la lista
 * y darlo de baja. Se agregan desde Visitas › Profesional permanente
 * (18/11/2026). La vivienda es la misma que la de «Invitar a
 * alguien» (la ubicación activa).
 */
export function useTrabajadoresDeLaVivienda(unidadDeLaVisita?: string) {
  const addToast = useUIStore((s) => s.addToast);
  const client = useQueryClient();
  const ubicaciones = useUbicacionStore((s) => s.ubicaciones);
  // La de la visita, si se abre desde Visitas (23/11/2026); si no, la activa.
  const unidadId =
    unidadDeLaVisita ?? (ubicaciones.find((u) => u.favorito) ?? ubicaciones[0])?.unidadId ?? "";
  const clave = ["unidad", "trabajadores", unidadId];

  const lista = useQuery({
    queryKey: clave,
    queryFn: () => obtenerTrabajadores(unidadId),
    enabled: Boolean(unidadId),
  });

  // Sus permisos y en qué va, para editarlos (23/11/2026). Si no los gestiona, la base no los da.
  const situacion = useQuery({
    queryKey: [...clave, "situacion"],
    queryFn: () => obtenerSituacionDeTrabajadores(unidadId),
    enabled: Boolean(unidadId),
    retry: false,
  });

  const refrescar = () => {
    void client.invalidateQueries({ queryKey: ["unidad", "trabajadores"] });
    // El directorio de la vivienda los enseña también.
    void client.invalidateQueries({ queryKey: ["directorio", "trabajadores"] });
  };

  const darDeBaja = useMutation({
    mutationFn: darDeBajaTrabajador,
    onSuccess: () => {
      refrescar();
      addToast("Dado de baja", "success");
    },
    onError: (e) => addToast(mensajeDeError(e, "No se pudo dar de baja"), "error"),
  });

  const cambiarPermisos = useMutation({
    mutationFn: ({ id, permisos: nuevos }: { id: string; permisos: PermisosDeTrabajador }) =>
      cambiarPermisosDeTrabajador(id, nuevos),
    onSuccess: () => {
      refrescar();
      addToast("Permisos guardados", "success");
    },
    onError: (e) => addToast(mensajeDeError(e, "No se pudieron guardar los permisos"), "error"),
  });

  // Otra vez la invitación, a quien todavía no la aceptó (23/11/2026).
  const reenviar = useMutation({
    mutationFn: (t: { id: string; correo: string; nombre: string }) => invitarTrabajador(t),
    onSuccess: (r) => {
      refrescar();
      addToast(r.correoEnviado ? "Invitación reenviada a su correo" : "Invitación lista", "success");
    },
    onError: (e) => addToast(mensajeDeError(e, "No se pudo reenviar la invitación"), "error"),
  });

  return {
    puede: Boolean(unidadId),
    reenviarInvitacion: (t: { id: string; correo: string; nombre: string }) => reenviar.mutate(t),
    reenviandoId: reenviar.isPending ? reenviar.variables?.id : undefined,
    situacion: situacion.data ?? {},
    cambiarPermisos: (id: string, nuevos: PermisosDeTrabajador) =>
      cambiarPermisos.mutateAsync({ id, permisos: nuevos }),
    guardandoPermisos: cambiarPermisos.isPending,
    trabajadores: lista.data ?? [],
    carga: estadoDe(lista),
    darDeBaja: (id: string) => darDeBaja.mutate(id),
    dandoDeBajaId: darDeBaja.isPending ? darDeBaja.variables : undefined,
  };
}
