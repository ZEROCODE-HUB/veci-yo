import type { ZonaComunConfig } from "@/stores/zonas-store";
import { useZonasStore } from "@/stores/zonas-store";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const administradorZonasQueryKey = ["administrador", "zonas"] as const;

export function getCurrentZonasConfig() {
  return useZonasStore.getState().zonasComunesConfig;
}

export async function fetchZonasConfig() {
  await delay(250);
  return getCurrentZonasConfig();
}

export async function saveZonaRequest(data: ZonaComunConfig) {
  await delay(250);
  return data;
}

export async function deleteZonaRequest(id: string) {
  await delay(250);
  return id;
}
