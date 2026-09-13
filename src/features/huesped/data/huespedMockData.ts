import type { AlojamientoConfig } from "../types";

export const ALOJAMIENTO_POR_DEFECTO: AlojamientoConfig = {
  descripcion: "Departamento de 2 habitaciones, 1 cama queen, 1 cama individual",
  numHabitaciones: 2,
  maxHuespedes: 4,
  estacionamientos: 1,
  politicaMascotas: "no-permitidas",
  aptoNinos: true,
};

export const MOCK_GUESTBOOK: Record<string, AlojamientoConfig> = {
  1: ALOJAMIENTO_POR_DEFECTO,
};

