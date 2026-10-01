export type TipoPasoVerificacion = "frente" | "dorso" | "rostro";

export interface ConfiguracionDocumento {
  frente: string;
  dorso?: string;
}

export interface TerminoVerificacion {
  checked: boolean;
  label: string;
}

export type TerminosVerificacion = Record<string, TerminoVerificacion>;
