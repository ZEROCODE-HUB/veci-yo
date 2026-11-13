import { estadoDe } from "@/shared/components";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCondominioActivo } from "@/shared/hooks";
import { useUIStore } from "@/stores/ui-store";
import {
  actualizarGuardia,
  darDeBajaGuardia,
  guardarOverride,
  guardarTurnos,
  invitarGuardia,
  obtenerSeguridad,
  quitarOverride,
  revocarInvitacionDeGuardia,
  type NuevoGuardia,
} from "../services/seguridad.repo";
import { mensajeDeError } from "@/shared/utils/error.util";

export const administradorSeguridadQueryKey = [
  "administrador",
  "seguridad",
] as const;

/**
 * Guardias y porterías del condominio.
 *
 * El alta de un guardia es una invitación --necesita una cuenta para iniciar
 * sesión-- y se emite desde aquí. A quien ya es miembro se le gestionan su
 * portería, sus turnos y sus permisos.
 */
export function useAdministradorSeguridad() {
  const client = useQueryClient();
  const condominioId = useCondominioActivo() ?? "";
  const addToast = useUIStore((s) => s.addToast);

  const query = useQuery({
    queryKey: [...administradorSeguridadQueryKey, condominioId],
    queryFn: () => obtenerSeguridad(condominioId),
    enabled: Boolean(condominioId),
    // Cuando el guardia acepta, «Invitación pendiente» cambia sola sin salir
    // de la pantalla (pedido del cliente, 29/10/2026).
    refetchInterval: 10_000,
  });

  const invalidar = () =>
    void client.invalidateQueries({ queryKey: administradorSeguridadQueryKey });

  const alFallar = (error: unknown) =>
    addToast(
      mensajeDeError(error, "No se pudo guardar el cambio"),
      "error",
    );

  const opciones = { onSuccess: invalidar, onError: alFallar };

  /*
    Las que guardan esperan y dicen si salió (13/11/2026): la pantalla
    cerraba o pintaba el cambio al pulsar, y los toques seguidos en el horario
    se pisaban. El motivo de un fallo lo avisa `alFallar`.
  */
  const salio = (promesa: Promise<unknown>) => promesa.then(() => true, () => false);

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

  const invitar = useMutation({
    mutationFn: (datos: Omit<NuevoGuardia, "condominioId">) =>
      invitarGuardia({ ...datos, condominioId }),
    onSuccess: invalidar,
    onError: alFallar,
  });

  const revocar = useMutation({
    mutationFn: (uuid: string) => revocarInvitacionDeGuardia(uuid),
    onSuccess: () => {
      invalidar();
      addToast("Invitación revocada", "success");
    },
    onError: alFallar,
  });

  const borrarOverride = useMutation({
    mutationFn: (uuid: string) => quitarOverride(uuid),
    ...opciones,
  });

  return {
    guardias: query.data?.guardias ?? [],
    porterias: query.data?.porterias ?? [],
    invitaciones: query.data?.invitaciones ?? [],
    cargando: query.isLoading,
    /** Sin esto, «No hay guardias que coincidan» salía mientras cargaba o si fallaba. */
    estado: estadoDe(query),

    /** Emite la invitación y devuelve el enlace mientras el correo esté apagado. */
    invitarGuardia: invitar.mutateAsync,
    invitando: invitar.isPending,
    revocarInvitacion: (uuid: string) => salio(revocar.mutateAsync(uuid)),
    /** La invitación que se está revocando. */
    revocando: revocar.isPending ? revocar.variables : undefined,

    updateGuardia: (uuid: string, datos: Parameters<typeof actualizarGuardia>[1]) =>
      salio(editar.mutateAsync({ uuid, datos })),
    deleteGuardia: (uuid: string) => salio(baja.mutateAsync(uuid)),
    borrandoGuardia: baja.isPending,
    saveTurnos: (uuid: string, lista: Parameters<typeof guardarTurnos>[1]) =>
      salio(turnos.mutateAsync({ uuid, turnos: lista })),
    saveOverride: (
      uuid: string,
      fecha: string,
      horaInicio?: string,
      horaFin?: string,
      motivo?: string,
    ) => salio(override.mutateAsync({ uuid, fecha, horaInicio, horaFin, motivo })),
    deleteOverride: (uuid: string) => salio(borrarOverride.mutateAsync(uuid)),
  };
}
