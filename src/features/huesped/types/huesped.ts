export type PoliticaMascotas = "permitidas" | "no-permitidas" | "no permitidas" | string;

export interface AlojamientoConfig {
  descripcion: string;
  numHabitaciones: number;
  maxHuespedes: number;
  estacionamientos: number;
  politicaMascotas: PoliticaMascotas;
  aptoNinos: boolean;
}

export interface LibroHuesped {
  wifiName?: string;
  wifiPassword?: string;
  doorPassword?: string;
  instructions?: string;
  notes?: string;
}

