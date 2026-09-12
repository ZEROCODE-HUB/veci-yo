import type { GestionZona } from "@/stores/zonas-store";
const pause = () => new Promise((resolve) => setTimeout(resolve, 150));
export async function saveGestionZonaRequest(zona: GestionZona) {
  await pause();
  return zona;
}
export async function deleteGestionZonaRequest(id: string) {
  await pause();
  return id;
}
