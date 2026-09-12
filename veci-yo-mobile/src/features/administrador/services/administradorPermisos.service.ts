import type { PermisoVivienda } from "@/shared/types";
const pause = () => new Promise((resolve) => setTimeout(resolve, 100));
export async function savePermisosRequest(permisos: PermisoVivienda) {
  await pause();
  return permisos;
}
