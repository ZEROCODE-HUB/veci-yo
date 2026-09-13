import {
  ALOJAMIENTO_POR_DEFECTO,
  MOCK_GUESTBOOK,
} from "../data/huespedMockData";
import type { AlojamientoConfig } from "../types";

const SIMULATED_REQUEST_DELAY = 150;

function esperar() {
  return new Promise<void>((resolve) =>
    setTimeout(resolve, SIMULATED_REQUEST_DELAY),
  );
}

export async function obtenerAlojamientoConfigRequest(
  ubicacionId: number,
): Promise<AlojamientoConfig> {
  await esperar();
  return MOCK_GUESTBOOK[String(ubicacionId)] || ALOJAMIENTO_POR_DEFECTO;
}
