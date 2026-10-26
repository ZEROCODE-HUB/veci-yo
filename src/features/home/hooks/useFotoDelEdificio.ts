import { useQuery } from "@tanstack/react-query";
import { useCondominioActivo } from "@/shared/hooks";
import { urlFotoDelCondominio } from "@/features/administrador/services/contactos.repo";
import { fotoQueryKey } from "@/features/administrador/hooks/useContactosDelCondominio";

/**
 * La foto del edificio para el círculo de Viviendas (hueco 6, 21/10/2026: «ya
 * hay espacio para eso en Viviendas, la imagen circular de arriba»). La sube la
 * administración en Arquitectura › Condominio; comparte la clave con esa
 * pantalla, así que al cambiarla se ve aquí sin recargar.
 */
export function useFotoDelEdificio(): string | null {
  const condominioId = useCondominioActivo() ?? "";
  const foto = useQuery({
    queryKey: [...fotoQueryKey, condominioId],
    queryFn: () => urlFotoDelCondominio(condominioId),
    enabled: Boolean(condominioId),
  });
  return foto.data ?? null;
}
