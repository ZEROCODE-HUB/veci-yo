import type { Ubicacion } from "@/shared/types";

export interface InsigniaVecino {
  key: string;
  icono: string;
  label: string;
  cantidad: number;
}

export interface DepartamentoCuadroHonor {
  id: number;
  departamento: string;
  responsable: string;
  estado: string;
  contador: string;
  medallas: boolean[];
}

export interface CuotaAdministracionHistorial {
  mes: string;
  esperado: number;
  recibido: number;
  alDia: number;
  atrasados: number;
  porcentaje: number;
}

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

