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

export interface UbicacionFormulario {
  distrito: string;
  urbanizacion: string;
  condominio: string;
  correoAdm: string;
  imagen: string | null;
}

export interface UbicacionAccionProps {
  ubicacion: Ubicacion;
  esGuardia: boolean;
  onEditar: (ubicacion: Ubicacion) => void;
  onEliminar: (ubicacion: Ubicacion) => void;
  onFavorito: (id: number) => void;
}

