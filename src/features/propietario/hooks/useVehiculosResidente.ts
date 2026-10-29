import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { mensajeDeError } from "@/shared/utils/error.util";
import { supabase } from "@/shared/services/supabase";
import { useAuthStore, useUIStore } from "@/stores";
import type { Database } from "@/shared/types/database.types";

/**
 * Vehiculos declarados por una vivienda.
 *
 * Vivian en un `useState` de la pantalla de Configuracion: se perdian al salir
 * y no llegaban a la porteria, que es quien necesita distinguir la placa de un
 * residente de la de una visita.
 *
 * Los tipos salen del enum `tipo_vehiculo`. La pantalla ofrecia un cuarto
 * vocabulario propio -- "Automovil", "Motocicleta", "Bicicleta", "Otro" -- que
 * no coincidia con el de la base ni con el del alta de visitas.
 *
 * `tipo` viaja como **codigo** de principio a fin: el nombre lo pone la
 * pantalla con la lista `tipos_de_vehiculo`, que el administrador puede
 * renombrar. Traducir a nombre al leer y de vuelta al guardar se rompia el dia
 * que un nombre cambiara (28/10/2026).
 */
type TipoVehiculo = Database["public"]["Enums"]["tipo_vehiculo"];

export interface VehiculoResidente {
  uuid: string;
  placa: string;
  tipo: TipoVehiculo;
}

export function useVehiculosResidente(unidadId: string) {
  const queryClient = useQueryClient();
  const usuarioId = useAuthStore((s) => s.usuarioId ?? "");
  const addToast = useUIStore((s) => s.addToast);
  const clave = ["propietario", "vehiculos", unidadId];

  const query = useQuery({
    queryKey: clave,
    queryFn: async (): Promise<VehiculoResidente[]> => {
      const { data, error } = await supabase
        .from("vehiculo_residente")
        .select("id, placa, tipo")
        .eq("unidad_id", unidadId)
        .is("deleted_at", null)
        .order("placa");

      if (error) throw error;

      return (data ?? []).map((fila) => ({
        uuid: fila.id,
        placa: fila.placa,
        tipo: fila.tipo,
      }));
    },
    enabled: Boolean(unidadId),
  });

  /*
    Cuántas cocheras privadas tiene la vivienda: es el tope de vehículos. Sale
    de `estacionamiento`, que es donde la administración las asigna.
  */
  const cocheras = useQuery({
    queryKey: [...clave, "cocheras"],
    queryFn: async (): Promise<number> => {
      const { count, error } = await supabase
        .from("estacionamiento")
        .select("id", { count: "exact", head: true })
        .eq("unidad_id", unidadId)
        .eq("tipo", "privado");
      if (error) throw error;
      return count ?? 0;
    },
    enabled: Boolean(unidadId),
  });

  const agregar = useMutation({
    mutationFn: async (datos: { placa: string; tipo: TipoVehiculo }) => {
      const { error } = await supabase.from("vehiculo_residente").insert({
        unidad_id: unidadId,
        placa: datos.placa.trim().toUpperCase(),
        tipo: datos.tipo,
        registrado_por: usuarioId,
      });

      if (error) {
        // El indice unico sobre la placa es la regla: una placa, una vivienda.
        if (error.code === "23505") {
          throw new Error("Esa placa ya está registrada en el condominio.");
        }
        throw error;
      }
    },
    onSuccess: () => {
      addToast("Vehículo agregado", "success");
      queryClient.invalidateQueries({ queryKey: clave });
    },
    onError: (error: Error) =>
      addToast(mensajeDeError(error, "No se pudo guardar el vehículo"), "error"),
  });

  const quitar = useMutation({
    // Borrado logico: el historial de ingresos sigue apuntando a la placa.
    mutationFn: async (uuid: string) => {
      const { error } = await supabase
        .from("vehiculo_residente")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", uuid);
      if (error) throw error;
    },
    onSuccess: () => {
      addToast("Vehículo eliminado", "success");
      queryClient.invalidateQueries({ queryKey: clave });
    },
    onError: (error: Error) =>
      addToast(mensajeDeError(error, "No se pudo guardar el vehículo"), "error"),
  });

  return {
    /** Cuántos vehículos caben: las cocheras privadas de la vivienda. */
    cocheras: cocheras.data ?? 0,
    vehiculos: query.data ?? [],
    cargando: query.isLoading,
    guardando: agregar.isPending,
    agregar: (datos: { placa: string; tipo: TipoVehiculo }) => agregar.mutate(datos),
    quitar: (uuid: string) => quitar.mutate(uuid),
  };
}
