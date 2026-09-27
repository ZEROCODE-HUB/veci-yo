import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/shared/services/supabase";

export interface UnidadDisponible {
  unidadId: string;
  condominioId: string;
  codigo: string;
  piso: number;
  torreNumero: number;
  torreNombre: string;
  /** Etiqueta tal como la muestran los selectores: "Torre 2". */
  torre: string;
}

/**
 * Las unidades sobre las que el usuario actual puede operar.
 *
 * No hace falta filtrar aquí: la política de lectura de `unidad` ya devuelve
 * las del condominio al que pertenece quien consulta, y nada más. Un guardia y
 * un administrador ven todas las de su edificio; un residente ve las de su
 * edificio para el directorio, pero las políticas de escritura de cada dominio
 * (`puede_operar_unidad`) le impiden actuar sobre las ajenas.
 *
 * Reemplaza a las constantes `TORRES` y `DEPARTAMENTOS` de `src/data`, que eran
 * listas fijas: con ellas se podía elegir una combinación torre/departamento
 * que no existe.
 */
export function useUnidadesDisponibles() {
  const query = useQuery({
    queryKey: ["unidades-disponibles"],
    queryFn: async (): Promise<UnidadDisponible[]> => {
      const { data, error } = await supabase
        .from("unidad")
        .select("id, codigo, piso, condominio_id, torre:torre_id ( numero, nombre )")
        .is("deleted_at", null)
        .order("codigo");

      if (error) throw error;

      return (data ?? []).map((fila) => ({
        unidadId: fila.id,
        condominioId: fila.condominio_id,
        codigo: fila.codigo,
        piso: fila.piso,
        torreNumero: fila.torre?.numero ?? 0,
        torreNombre: fila.torre?.nombre ?? "",
        torre: `Torre ${fila.torre?.numero ?? ""}`.trim(),
      }));
    },
  });

  const unidades = query.data ?? [];

  return {
    unidades,
    cargando: query.isLoading,
    /** Torres distintas, ordenadas, para alimentar el selector. */
    torres: [...new Set(unidades.map((u) => u.torre))].sort(),
    /** Códigos de unidad de una torre; sin torre, todos. */
    codigosDe: (torre?: string) =>
      unidades
        .filter((u) => !torre || u.torre === torre)
        .map((u) => u.codigo),
    /** Resuelve la unidad a partir de lo elegido en los selectores. */
    resolver: (torre?: string, codigo?: string) =>
      unidades.find(
        (u) => (!torre || u.torre === torre) && (!codigo || u.codigo === codigo),
      ),
  };
}
