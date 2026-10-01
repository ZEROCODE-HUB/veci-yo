import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/shared/services/supabase";
import { useCondominioActivo } from "@/shared/hooks";
import { useUIStore } from "@/stores";
import {
  asignarEstacionamiento,
  liberarEstacionamiento,
} from "@/features/administrador/services/arquitectura.repo";

/**
 * Estacionamientos de visita del condominio, con su ocupacion.
 *
 * El modal de asignacion generaba los cupos en el cliente: `B01`..`B20` a
 * partir de `estacionamientos.total || 20`. Los estacionamientos son filas con
 * su propio codigo y su propia ubicacion, asi que un condominio cuyos cupos se
 * llamen "V-1" o "S2-14" veia veinte casillas que no existen.
 */
export interface CupoVisita {
  uuid: string;
  codigo: string;
  ubicacion: string;
  ocupado: boolean;
  /** Visita que lo ocupa ahora mismo, si lo esta. */
  visitaId: string | null;
}

export function useEstacionamientosVisita() {
  const condominioId = useCondominioActivo() ?? "";
  const queryClient = useQueryClient();
  const addToast = useUIStore((s) => s.addToast);
  const clave = ["visitas", "estacionamientos", condominioId];

  const query = useQuery({
    queryKey: clave,
    queryFn: async (): Promise<CupoVisita[]> => {
      const { data, error } = await supabase
        .from("estacionamiento")
        // En una sola pieza: Supabase deduce la forma del literal del `select`,
        // y concatenado devolvia `GenericStringError`.
        .select(
          `id, codigo, ubicacion,
           asignaciones:asignacion_estacionamiento ( visita_id, liberado_en )`,
        )
        .eq("condominio_id", condominioId)
        .eq("tipo", "visitante")
        .order("codigo");

      if (error) throw error;

      return (data ?? []).map((fila) => ({
        uuid: fila.id,
        codigo: fila.codigo,
        ubicacion: fila.ubicacion ?? "",
        ocupado: (fila.asignaciones ?? []).some(
          (a) => a.liberado_en === null,
        ),
        visitaId:
          (fila.asignaciones ?? []).find((a) => a.liberado_en === null)
            ?.visita_id ?? null,
      }));
    },
    enabled: Boolean(condominioId),
  });

  /*
    El `insert` y el `update` estaban escritos aqui **y** en
    `arquitectura.repo`, iguales los dos. La copia del repositorio no la
    llamaba nadie, asi que la de aqui era la que corria y la otra se quedo de
    documentacion falsa: quien la leyera creeria que ese es el camino.
  */
  const asignar = useMutation({
    mutationFn: (params: { estacionamientoUuid: string; visitaUuid: string }) =>
      asignarEstacionamiento(params.estacionamientoUuid, params.visitaUuid),
    onSuccess: () => {
      addToast("Estacionamiento asignado", "success");
      queryClient.invalidateQueries({ queryKey: clave });
    },
    onError: (error: Error) => addToast(error.message, "error"),
  });

  /**
   * Soltar un cupo a mano.
   *
   * Normalmente se suelta solo, cuando la visita termina o se cancela. Pero
   * `liberarEstacionamiento` llevaba dias escrita sin que la llamara nadie, y
   * el hueco se ve en dos casos reales:
   *
   *   · el visitante mueve el coche antes de irse;
   *   · alguien **deshace** una salida --se puede-- y entonces el cupo se
   *     queda tomado sin nadie dentro y no hay forma de soltarlo (R-8, R-19).
   *
   * Es de porteria y administracion: la politica de
   * `asignacion_estacionamiento` ya lo limita, esto solo pone el boton.
   */
  const liberar = useMutation({
    mutationFn: (estacionamientoUuid: string) =>
      liberarEstacionamiento(estacionamientoUuid),
    onSuccess: () => {
      addToast("Estacionamiento liberado", "success");
      queryClient.invalidateQueries({ queryKey: clave });
    },
    onError: (error: Error) => addToast(error.message, "error"),
  });

  const cupos = query.data ?? [];

  return {
    cupos,
    /**
     * Codigos ocupados por cada visita. Reemplaza al mapa en memoria
     * `{ B03: '1-0' }` del store, que se perdia al recargar y nunca coincidio
     * con ningun estacionamiento real.
     */
    porVisita: cupos.reduce<Record<string, string[]>>((mapa, cupo) => {
      if (cupo.visitaId) {
        (mapa[cupo.visitaId] ??= []).push(cupo.codigo);
      }
      return mapa;
    }, {}),
    cargando: query.isLoading,
    asignando: asignar.isPending,
    asignar: (estacionamientoUuid: string, visitaUuid: string) =>
      asignar.mutate({ estacionamientoUuid, visitaUuid }),
    liberando: liberar.isPending,
    liberar: (estacionamientoUuid: string) =>
      liberar.mutate(estacionamientoUuid),
  };
}
