import { useAuthStore } from "@/stores/auth-store";
import { useUbicacionStore } from "@/stores/ubicacion-store";
import type { MembresiaUnidad } from "@/shared/services/sesion";

/**
 * La vivienda sobre la que opera la persona ahora mismo.
 *
 * El selector de viviendas trabaja con `Ubicacion`, que tiene un `id` numérico
 * de presentación, no el uuid de la unidad. Cada pantalla resolvía la
 * equivalencia por su cuenta y de tres formas distintas —por índice, por
 * código contra `useAdminStore`, o cogiendo `unidades[0]` y olvidándose del
 * selector—. La tercera es un defecto: quien tiene dos viviendas veía siempre
 * la primera.
 *
 * Aquí se resuelve una vez, emparejando por torre y código, que es lo que
 * identifica una vivienda dentro del edificio.
 */
export function useUnidadActiva(): MembresiaUnidad | null {
  const ubicaciones = useUbicacionStore((s) => s.ubicaciones);
  const unidades = useAuthStore((s) => s.unidades);

  const activa =
    ubicaciones.find((ubicacion) => ubicacion.favorito) ?? ubicaciones[0];
  if (!activa) return unidades[0] ?? null;

  return (
    unidades.find(
      (u) => u.codigo === activa.codigo && u.torreNumero === activa.torreNumero,
    ) ??
    unidades[0] ??
    null
  );
}
