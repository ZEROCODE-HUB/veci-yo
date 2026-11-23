import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/shared/services/supabase";
import { useAuthStore } from "@/stores/auth-store";
import { useUbicacionStore } from "@/stores/ubicacion-store";
import { condominioDelRol } from "./condominioDelRol";

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
  /*
    Del edificio del rol activo (20/11/2026). RLS deja ver las viviendas de
    **todos** los edificios donde la persona tiene un rol: con la cuenta
    multirol, la portería de Pino ofrecía cinco «101» y llamar al de otro
    edificio fallaba («No puedes llamar a ese destino desde aquí»).
  */
  const rolActivo = useAuthStore((s) => s.rolActivo);
  const condominios = useAuthStore((s) => s.condominios);
  const misUnidades = useAuthStore((s) => s.unidades);
  const ubicaciones = useUbicacionStore((s) => s.ubicaciones);
  const elegida = ubicaciones.find((u) => u.favorito) ?? ubicaciones[0];
  const condominioId = condominioDelRol(rolActivo, condominios, misUnidades, elegida);

  const query = useQuery({
    queryKey: ["unidades-disponibles", condominioId],
    queryFn: async (): Promise<UnidadDisponible[]> => {
      let consulta = supabase
        .from("unidad")
        .select("id, codigo, piso, condominio_id, torre:torre_id ( numero, nombre )")
        .is("deleted_at", null);
      if (condominioId) consulta = consulta.eq("condominio_id", condominioId);
      const { data, error } = await consulta.order("codigo");

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
    /*
      Sin código no hay vivienda. Con los dos desplegables vacíos esto
      devolvía la **primera del edificio**, y la portería anotaba a la 101 una
      visita de la que no había dicho para quién era (12/10/2026).
    */
    resolver: (torre?: string, codigo?: string) =>
      codigo
        ? unidades.find(
            (u) => (!torre || u.torre === torre) && u.codigo === codigo,
          )
        : undefined,
  };
}
