import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCondominioActivo } from "@/shared/hooks";
import { useUIStore } from "@/stores/ui-store";
import type { Deposito, Torre } from "@/stores/admin-store";
import {
  actualizarDeposito,
  actualizarPorteria,
  actualizarTorre,
  actualizarUnidad,
  crearDeposito,
  actualizarEstacionamiento,
  crearEstacionamiento,
  eliminarEstacionamiento,
  crearPorteria,
  crearTorre,
  crearUnidad,
  eliminarDeposito,
  eliminarPorteria,
  eliminarTorre,
  eliminarUnidad,
  obtenerArquitectura,
} from "../services/arquitectura.repo";

export const arquitecturaQueryKey = ["administrador", "arquitectura"] as const;

/**
 * Arquitectura del condominio. Antes cada operacion escribia en el store de
 * Zustand y ademas invalidaba una consulta que leia ese mismo store.
 */
export function useAdministradorArquitectura() {
  const client = useQueryClient();
  const condominioId = useCondominioActivo() ?? "";
  const addToast = useUIStore((s) => s.addToast);

  const query = useQuery({
    queryKey: arquitecturaQueryKey,
    queryFn: obtenerArquitectura,
  });

  const invalidar = () => {
    void client.invalidateQueries({ queryKey: arquitecturaQueryKey });
    // Los selectores de unidad de toda la app dependen de esto.
    void client.invalidateQueries({ queryKey: ["unidades-disponibles"] });
    /*
      Y la otra consulta de lo mismo. `useDatosCondominio` pide la arquitectura
      con su propia clave --`["condominio", "arquitectura", id]`-- para llenar
      el store que leen la portada, el directorio y el alojamiento del huesped.

      Sin esto, dar de alta una cochera se veia al momento en Arquitectura y en
      ningun otro sitio: la portada seguia diciendo «1 de 1 disponibles» con dos
      creadas, hasta que pasaran cinco minutos o alguien recargara. Lo mismo con
      torres, viviendas, depositos y porterias.
    */
    void client.invalidateQueries({ queryKey: ["condominio", "arquitectura"] });
  };

  const alFallar = (error: unknown) =>
    addToast(
      error instanceof Error ? error.message : "No se pudo guardar el cambio",
      "error",
    );

  const opciones = { onSuccess: invalidar, onError: alFallar };

  const nuevaTorre = useMutation({
    mutationFn: (datos: Partial<Torre>) => crearTorre(condominioId, datos),
    ...opciones,
  });
  const editarTorre = useMutation({
    mutationFn: ({ uuid, datos }: { uuid: string; datos: Partial<Torre> }) =>
      actualizarTorre(uuid, datos),
    ...opciones,
  });
  const borrarTorre = useMutation({
    mutationFn: (uuid: string) => eliminarTorre(uuid),
    ...opciones,
  });

  const nuevaUnidad = useMutation({
    mutationFn: (datos: Parameters<typeof crearUnidad>[1]) =>
      crearUnidad(condominioId, datos),
    ...opciones,
  });
  const editarUnidad = useMutation({
    mutationFn: ({
      uuid,
      datos,
    }: {
      uuid: string;
      datos: Parameters<typeof actualizarUnidad>[1];
    }) => actualizarUnidad(uuid, datos),
    ...opciones,
  });
  const borrarUnidad = useMutation({
    mutationFn: (uuid: string) => eliminarUnidad(uuid),
    ...opciones,
  });

  const nuevoDeposito = useMutation({
    mutationFn: (datos: Parameters<typeof crearDeposito>[1]) =>
      crearDeposito(condominioId, datos),
    ...opciones,
  });
  const editarDeposito = useMutation({
    mutationFn: ({
      uuid,
      datos,
    }: {
      uuid: string;
      datos: Parameters<typeof actualizarDeposito>[1];
    }) => actualizarDeposito(uuid, datos),
    ...opciones,
  });
  const borrarDeposito = useMutation({
    mutationFn: (uuid: string) => eliminarDeposito(uuid),
    ...opciones,
  });

  const nuevaPorteria = useMutation({
    mutationFn: (datos: Parameters<typeof crearPorteria>[1]) =>
      crearPorteria(condominioId, datos),
    ...opciones,
  });
  const editarPorteria = useMutation({
    mutationFn: ({
      uuid,
      datos,
    }: {
      uuid: string;
      datos: Parameters<typeof actualizarPorteria>[1];
    }) => actualizarPorteria(uuid, datos),
    ...opciones,
  });
  const borrarPorteria = useMutation({
    mutationFn: (uuid: string) => eliminarPorteria(uuid),
    ...opciones,
  });

  const nuevoEstacionamiento = useMutation({
    mutationFn: (datos: Parameters<typeof crearEstacionamiento>[1]) =>
      crearEstacionamiento(condominioId, datos),
    ...opciones,
  });
  const editarEstacionamiento = useMutation({
    mutationFn: ({
      uuid,
      datos,
    }: {
      uuid: string;
      datos: Parameters<typeof actualizarEstacionamiento>[1];
    }) => actualizarEstacionamiento(uuid, datos),
    ...opciones,
  });
  const borrarEstacionamiento = useMutation({
    mutationFn: (uuid: string) => eliminarEstacionamiento(uuid),
    ...opciones,
  });

  return {
    torres: query.data?.torres ?? [],
    unidades: query.data?.unidades ?? [],
    depositos: query.data?.depositos ?? ([] as Deposito[]),
    porterias: query.data?.porterias ?? [],
    estacionamientos: query.data?.estacionamientos ?? [],
    cargando: query.isLoading,

    createTower: nuevaTorre.mutate,
    updateTower: (uuid: string, datos: Partial<Torre>) =>
      editarTorre.mutate({ uuid, datos }),
    deleteTower: borrarTorre.mutate,

    createUnit: nuevaUnidad.mutate,
    updateUnit: (uuid: string, datos: Parameters<typeof actualizarUnidad>[1]) =>
      editarUnidad.mutate({ uuid, datos }),
    deleteUnit: borrarUnidad.mutate,

    createDeposit: nuevoDeposito.mutate,
    updateDeposit: (uuid: string, datos: Parameters<typeof actualizarDeposito>[1]) =>
      editarDeposito.mutate({ uuid, datos }),
    deleteDeposit: borrarDeposito.mutate,

    createPorteria: nuevaPorteria.mutate,
    updatePorteria: (uuid: string, datos: Parameters<typeof actualizarPorteria>[1]) =>
      editarPorteria.mutate({ uuid, datos }),
    deletePorteria: borrarPorteria.mutate,

    createEstacionamiento: nuevoEstacionamiento.mutate,
    updateEstacionamiento: (
      uuid: string,
      datos: Parameters<typeof actualizarEstacionamiento>[1],
    ) => editarEstacionamiento.mutate({ uuid, datos }),
    deleteEstacionamiento: borrarEstacionamiento.mutate,
  };
}
