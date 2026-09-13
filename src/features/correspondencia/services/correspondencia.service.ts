import type { CorrespondenciaItem } from "@/shared/types";
import { useCorrespondenciaFeatureStore } from "../stores/correspondencia.store";
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
export async function fetchCorrespondenciaRequest() {
  await delay(300);
  return useCorrespondenciaFeatureStore.getState().items;
}
export async function createCorrespondenciaRequest(
  item: Omit<CorrespondenciaItem, "id" | "fecha">,
) {
  await delay(300);
  return {
    ...item,
    id: Date.now(),
    fecha: new Date().toLocaleDateString("es-AR"),
  };
}
export async function updateCorrespondenciaRequest({
  id,
  estado,
  extras,
}: {
  id: number;
  estado: CorrespondenciaItem["estado"];
  extras?: Partial<CorrespondenciaItem>;
}) {
  await delay(200);
  return { id, estado, extras };
}
export async function deleteCorrespondenciaRequest(id: number) {
  await delay(200);
  return id;
}
