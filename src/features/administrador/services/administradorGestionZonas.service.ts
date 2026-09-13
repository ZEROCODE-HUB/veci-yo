import type { GestionZona, ZonaComunConfig } from "@/stores/zonas-store";
const pause = () => new Promise((resolve) => setTimeout(resolve, 150));
export interface SaveGestionZonaInput {
  zona: GestionZona;
  zonaConfig?: Partial<ZonaComunConfig>;
}

export async function saveGestionZonaRequest(input: SaveGestionZonaInput) {
  await pause();
  return input;
}
export async function deleteGestionZonaRequest(id: string) {
  await pause();
  return id;
}
