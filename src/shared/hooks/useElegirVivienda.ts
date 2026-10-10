import { useCallback } from "react";
import { useUbicacionStore } from "@/stores/ubicacion-store";
import { elegirUnidadActiva } from "@/shared/services/viviendaActiva.repo";

/**
 * Cambiar de vivienda, **y que se recuerde**.
 *
 * El selector marcaba la vivienda en memoria y nada más: al recargar se volvía
 * a «la primera». Los dos sitios desde los que se cambia —la barra de arriba y
 * «Administrar mis ubicaciones»— pasan ahora por aquí.
 *
 * Primero la pantalla, luego la base: el cambio se ve al instante, y si
 * guardarlo falla no se deshace —la persona sigue en la vivienda que eligió,
 * solo que la próxima vez no se acordará—. No es motivo para un aviso.
 */
export function useElegirVivienda() {
  const marcar = useUbicacionStore((estado) => estado.toggleFavoritoUbicacion);

  return useCallback(
    (id: number) => {
      marcar(id);
      const elegida = useUbicacionStore
        .getState()
        .ubicaciones.find((ubicacion) => ubicacion.id === id);
      if (elegida?.unidadId) {
        void elegirUnidadActiva(elegida.unidadId).catch(() => {});
      }
    },
    [marcar],
  );
}
