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
      error instanceof Error ? error.message : "No se pudo guardar el cambio",
      "error",
    );

  const invitar = useMutation({
    mutationFn: (datos: Omit<NuevoCoadministrador, "condominioId">) =>
      invitarCoadministrador({ ...datos, condominioId }),
    onSuccess: (resultado) => {
      invalidar();
      // Mientras el envio de correo este apagado, el enlace se muestra para
      // poder recorrer el flujo. Ver docs y la nota de memoria del proyecto.
      addToast(
        resultado.correoEnviado
          ? "Invitación enviada por correo"
          : `Invitación creada. Enlace: ${resultado.enlace}`,
        "success",
      );
    },
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
    onSuccess: invalidar,
    onError: alFallar,
  });

  const quitar = useMutation({
    mutationFn: ({ uuid, esInvitacion }: { uuid: string; esInvitacion: boolean }) =>
      quitarCoadministrador(uuid, esInvitacion),
    onSuccess: invalidar,
    onError: alFallar,
  });

  return {
    data: query.data ?? [],
    cargando: query.isLoading,
    invitarCoadministrador: invitar.mutate,
    invitando: invitar.isPending,
    saveCoadministrador: (
      uuid: string,
      datos: Parameters<typeof actualizarCoadministrador>[1],
    ) => editar.mutate({ uuid, datos }),
    deleteCoadministrador: (uuid: string, esInvitacion = false) =>
      quitar.mutate({ uuid, esInvitacion }),
  };
}
