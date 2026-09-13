import type { Guardia } from "@/shared/types";
import { useAdminStore } from "@/stores/admin-store";
import type { SecuritySnapshot } from "../types";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const administradorSeguridadQueryKey = [
  "administrador",
  "seguridad",
] as const;

export function getCurrentSecuritySnapshot(): SecuritySnapshot {
  const state = useAdminStore.getState();
  return { guardias: state.guardias, porterias: state.porterias };
}

export async function fetchSecuritySnapshot() {
  await delay(250);
  return getCurrentSecuritySnapshot();
}

export async function createGuardiaRequest(data: Omit<Guardia, "id">) {
  await delay(250);
  return data;
}

export async function updateGuardiaRequest(data: Guardia) {
  await delay(250);
  return data;
}

export async function deleteGuardiaRequest(data: Guardia) {
  await delay(250);
  return data;
}
