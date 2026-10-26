import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCondominioActivo } from "@/shared/hooks";
import { useUIStore } from "@/stores/ui-store";
import { mensajeDeError } from "@/shared/utils/error.util";
import {
  guardarContactoDelCondominio,
  obtenerContactosDelCondominio,
  retirarContactoDelCondominio,
  subirFotoDelCondominio,
  urlFotoDelCondominio,
  type ContactoDelCondominio,
} from "../services/contactos.repo";

/** La misma clave la invalida Soporte → Contacto, que los enseña. */
export const contactosQueryKey = ["condominio", "contactos"] as const;
/** La misma clave la lee Viviendas, que la enseña en el círculo (hueco 6). */
export const fotoQueryKey = ["condominio", "foto"] as const;

export function useContactosDelCondominio() {
  const client = useQueryClient();
  const condominioId = useCondominioActivo() ?? "";
  const addToast = useUIStore((s) => s.addToast);

  const contactos = useQuery({
    queryKey: [...contactosQueryKey, condominioId],
    queryFn: () => obtenerContactosDelCondominio(condominioId),
    enabled: Boolean(condominioId),
  });

  const foto = useQuery({
    queryKey: [...fotoQueryKey, condominioId],
    queryFn: () => urlFotoDelCondominio(condominioId),
    enabled: Boolean(condominioId),
  });

  const alFallar = (porDefecto: string) => (error: unknown) =>
    addToast(mensajeDeError(error, porDefecto), "error");

  const guardar = useMutation({
    mutationFn: (
      contacto: Omit<ContactoDelCondominio, "id"> & { id?: string },
    ) => guardarContactoDelCondominio(condominioId, contacto),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: contactosQueryKey });
      addToast("Contacto guardado", "success");
    },
    onError: alFallar("No se pudo guardar el contacto"),
  });

  const retirar = useMutation({
    mutationFn: retirarContactoDelCondominio,
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: contactosQueryKey });
      addToast("Contacto quitado", "success");
    },
    onError: alFallar("No se pudo quitar el contacto"),
  });

  const subirFoto = useMutation({
    mutationFn: (uri: string) => subirFotoDelCondominio(condominioId, uri),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: fotoQueryKey });
      addToast("Foto del condominio guardada", "success");
    },
    onError: alFallar("No se pudo guardar la foto"),
  });

  return {
    contactos: contactos.data ?? [],
    cargando: contactos.isLoading,
    fotoUrl: foto.data ?? null,
    guardar: guardar.mutateAsync,
    guardando: guardar.isPending,
    retirar: retirar.mutate,
    subirFoto: subirFoto.mutate,
    subiendoFoto: subirFoto.isPending,
  };
}
