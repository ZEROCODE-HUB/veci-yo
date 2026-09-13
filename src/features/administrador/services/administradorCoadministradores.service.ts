import type { Coadministrador } from "@/shared/types";
const pause = () => new Promise((resolve) => setTimeout(resolve, 100));
export async function saveCoadministradorRequest(item: Coadministrador) {
  await pause();
  return item;
}
export async function deleteCoadministradorRequest(id: number) {
  await pause();
  return id;
}
