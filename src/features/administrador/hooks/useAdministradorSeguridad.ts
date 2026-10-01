import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCondominioActivo } from "@/shared/hooks";
import { useUIStore } from "@/stores/ui-store";
import {
  actualizarGuardia,
  darDeBajaGuardia,
  guardarOverride,
  guardarTurnos,
  obtenerSeguridad,
  quitarOverride,
} from "../services/seguridad.repo";
import { mensajeDeError } from "@/shared/utils/error.util";

export const administradorSeguridadQueryKey = [
  "administrador",
  "seguridad",
] as const;

/**
 * Guardias y porterías del condominio.
 *
 * El alta de un guardia NO ocurre aquí: se hace invitándolo por correo, porque
 * necesita una cuenta para iniciar sesión. Esta pantalla gestiona a los que ya
 * son miembros — su portería, sus turnos y sus permisos.
 */
export function useAdministradorSeguridad() {
  const client = useQueryClient();
  const condominioId = useCondominioActivo() ?? "";
  const addToast = useUIStore((s) => s.addToast);

  const query = useQuery({
    queryKey: [...administradorSeguridadQueryKey, condominioId],
    queryFn: () => obtenerSeguridad(condominioId),
    enabled: Boolean(condominioId),
  });

  const invalidar = () =>
    void client.invalidateQueries({ queryKey: administradorSeguridadQueryKey });

  const alFallar = (error: unknown) =>
    addToast(
      mensajeDeError(error, "No se pudo guardar el cambio"),
      "error",
    );

  const opciones = { onSuccess: invalidar, onError: alFallar };

  const editar = useMutation({
    mutationFn: ({
      uuid,
      datos,
    }: {
      uuid: string;
      datos: Parameters<typeof actualizarGuardia>[1];
    }) => actualizarGuardia(uuid, datos),
    ...opciones,
  });

  const baja = useMutation({
    mutationFn: (uuid: string) => darDeBajaGuardia(uuid),
    ...opciones,
  });

  const turnos = useMutation({
    mutationFn: ({
      uuid,
      turnos: lista,
    }: {
      uuid: string;
      turnos: Parameters<typeof guardarTurnos>[1];
    }) => guardarTurnos(uuid, lista),
    ...opciones,
  });

  const override = useMutation({
    mutationFn: ({
      uuid,
      fecha,
      horaInicio,
      horaFin,
      motivo,
    }: {
      uuid: string;
      fecha: string;
      horaInicio?: string;
      horaFin?: string;
      motivo?: string;
    }) => guardarOverride(uuid, fecha, horaInicio, horaFin, motivo),
    ...opciones,
  });

  const borrarOverride = useMutation({
    mutationFn: (uuid: string) => quitarOverride(uuid),
    ...opciones,
  });

  return {
    guardias: query.data?.guardias ?? [],
    porterias: query.data?.porterias ?? [],
    cargando: query.isLoading,

    updateGuardia: (uuid: string, datos: Parameters<typeof actualizarGuardia>[1]) =>
      editar.mutate({ uuid, datos }),
    deleteGuardia: (uuid: string) => baja.mutate(uuid),
    saveTurnos: (uuid: string, lista: Parameters<typeof guardarTurnos>[1]) =>
      turnos.mutate({ uuid, turnos: lista }),
    saveOverride: (
      uuid: string,
      fecha: string,
      horaInicio?: string,
      horaFin?: string,
      motivo?: string,
    ) => override.mutate({ uuid, fecha, horaInicio, horaFin, motivo }),
    deleteOverride: (uuid: string) => borrarOverride.mutate(uuid),
  };
}
