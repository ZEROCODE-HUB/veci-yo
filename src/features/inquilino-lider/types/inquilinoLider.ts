import type { Ubicacion } from "@/shared/types";

export interface InsigniaVecino {
  key: string;
  icono: string;
  label: string;
  cantidad: number;
}

// `DepartamentoCuadroHonor` y `CuotaAdministracionHistorial` vivian aqui con la
// forma del mock (id numerico, `estado` en texto, `medallas: boolean[]`). Ahora
// los definen los repos, junto a la consulta que los produce:
// `UnidadCuadroHonor` y `PeriodoCuota` en `services/cuadroHonor.repo.ts`.

export interface UbicacionAccionProps {
  ubicacion: Ubicacion;
  esGuardia: boolean;
  onFavorito: (id: number) => void;
  /**
   * Abrir el campo del apodo. Opcional porque la porteria ve esta tarjeta sin
   * el --mira el edificio donde trabaja, no una vivienda suya--.
   */
  onPonerNombre?: (ubicacion: Ubicacion) => void;
}

