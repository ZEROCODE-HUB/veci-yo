import type { UbicacionFormValues } from "../types/ubicacion";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function saveUbicacionRequest(data: UbicacionFormValues) {
  await delay(250);
  return data;
}
