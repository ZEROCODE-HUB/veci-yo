import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/shared/services/supabase";
import { useAuthStore, useUIStore } from "@/stores";
import { TIPO_VEHICULO, claveDeEtiqueta, etiquetasDe } from "@/shared/constants";

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
 */
export interface VehiculoResidente {
  uuid: string;
  placa: string;
  tipo: string;
}

export const TIPOS_VEHICULO_RESIDENTE = etiquetasDe(TIPO_VEHICULO);

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
        tipo: TIPO_VEHICULO[fila.tipo] ?? fila.tipo,
      }));
    },
    enabled: Boolean(unidadId),
  });

  const agregar = useMutation({
    mutationFn: async (datos: { placa: string; tipo: string }) => {
      const { error } = await supabase.from("vehiculo_residente").insert({
        unidad_id: unidadId,
        placa: datos.placa.trim().toUpperCase(),
        tipo: claveDeEtiqueta(TIPO_VEHICULO, datos.tipo) ?? "auto",
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
    onError: (error: Error) => addToast(error.message, "error"),
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
    onError: (error: Error) => addToast(error.message, "error"),
  });

  return {
    vehiculos: query.data ?? [],
    cargando: query.isLoading,
    guardando: agregar.isPending,
    agregar: (datos: { placa: string; tipo: string }) => agregar.mutate(datos),
    quitar: (uuid: string) => quitar.mutate(uuid),
  };
}
