import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCondominioActivo } from "@/shared/hooks";
import { useUIStore } from "@/stores/ui-store";
import {
  actualizarCoadministrador,
  invitarCoadministrador,
  obtenerCoadministradores,
  quitarCoadministrador,
  type NuevoCoadministrador,
} from "../services/coadministradores.repo";
import { mensajeDeError } from "@/shared/utils/error.util";

export const coadministradoresQueryKey = [
  "administrador",
  "coadministradores",
] as const;

export function useAdministradorCoadministradores() {
  const client = useQueryClient();
  const condominioId = useCondominioActivo() ?? "";
  const addToast = useUIStore((s) => s.addToast);

  const query = useQuery({
    queryKey: [...coadministradoresQueryKey, condominioId],
    queryFn: () => obtenerCoadministradores(condominioId),
    enabled: Boolean(condominioId),
  });

  const invalidar = () =>
    void client.invalidateQueries({ queryKey: coadministradoresQueryKey });

  const alFallar = (error: unknown) =>
    addToast(
      mensajeDeError(error, "No se pudo guardar el cambio"),
      "error",
    );

  const invitar = useMutation({
    mutationFn: (datos: Omit<NuevoCoadministrador, "condominioId">) =>
      invitarCoadministrador({ ...datos, condominioId }),
    /*
      El enlace salía en un aviso de tres segundos, que ni se copia ni se
      vuelve a leer. Lo enseña la pantalla, en una ventana (13/10/2026).
    */
    onSuccess: invalidar,
    onError: alFallar,
  });

  const editar = useMutation({
    mutationFn: ({
      uuid,
      datos,
    }: {
      uuid: string;
      datos: Parameters<typeof actualizarCoadministrador>[1];
    }) => actualizarCoadministrador(uuid, datos),
    // El éxito se dice aquí, cuando ya ocurrió: la pantalla lo anunciaba al
    // pulsar, y un segundo después llegaba el error.
    onSuccess: () => {
      invalidar();
      addToast("Coadministrador actualizado", "success");
    },
    onError: alFallar,
  });

  const quitar = useMutation({
    mutationFn: ({ uuid, esInvitacion }: { uuid: string; esInvitacion: boolean }) =>
      quitarCoadministrador(uuid, esInvitacion),
    onSuccess: (_resultado, { esInvitacion }) => {
      invalidar();
      addToast(
        esInvitacion ? "Invitación revocada" : "Coadministrador dado de baja",
        "success",
      );
    },
    onError: alFallar,
  });

  return {
    data: query.data ?? [],
    cargando: query.isLoading,
    invitarCoadministrador: invitar.mutateAsync,
    invitando: invitar.isPending,
    guardando: editar.isPending,
    saveCoadministrador: (
      uuid: string,
      datos: Parameters<typeof actualizarCoadministrador>[1],
    ) => editar.mutateAsync({ uuid, datos }),
    deleteCoadministrador: (uuid: string, esInvitacion = false) =>
      quitar.mutate({ uuid, esInvitacion }),
  };
}
