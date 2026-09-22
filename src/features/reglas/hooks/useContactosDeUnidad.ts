import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/shared/services/supabase";
import { useAdminStore, useUbicacionStore } from "@/stores";

export interface ContactoUnidad {
  nombre: string;
  telefono: string;
}

export interface ContactosUnidad {
  anfitrion: ContactoUnidad | null;
  administrador: ContactoUnidad | null;
  propietario: ContactoUnidad | null;
}

const contacto = (nombre?: string | null, telefono?: string | null) =>
  nombre ? { nombre, telefono: telefono ?? "" } : null;

/**
 * Los tres contactos de la vivienda activa.
 *
 * Salen de `contactos_de_unidad`, que los resuelve en la base. No se leen de
 * `membresia_unidad` directamente porque un huésped solo ve su propia fila de
 * esa tabla, y es justamente quien más necesita estos teléfonos.
 */
export function useContactosDeUnidad() {
  const ubicaciones = useUbicacionStore((state) => state.ubicaciones);
  const unidades = useAdminStore((state) => state.unidades);

  const ubicacionActiva =
    ubicaciones.find((ubicacion) => ubicacion.favorito) || ubicaciones[0];
  const unidad = unidades.find(
    (item) => item.codigo === ubicacionActiva?.codigo,
  );
  const unidadId = (unidad as any)?.uuid ?? "";

  const query = useQuery({
    queryKey: ["reglas", "contactos", unidadId],
    enabled: Boolean(unidadId),
    queryFn: async (): Promise<ContactosUnidad> => {
      const { data, error } = await supabase
        .rpc("contactos_de_unidad", { p_unidad_id: unidadId })
        .maybeSingle();
      if (error) throw error;
      return {
        anfitrion: contacto(data?.anfitrion_nombre, data?.anfitrion_telefono),
        administrador: contacto(
          data?.administrador_nombre,
          data?.administrador_telefono,
        ),
        propietario: contacto(
          data?.propietario_nombre,
          data?.propietario_telefono,
        ),
      };
    },
  });

  return { ...query, contactos: query.data ?? null };
}
