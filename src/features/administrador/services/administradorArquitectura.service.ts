import type { Deposito, Porteria, Torre, Unidad } from "@/stores/admin-store";
import { useAdminStore } from "@/stores/admin-store";
import type { ArchitectureSnapshot } from "../types/arquitectura";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const administradorArquitecturaQueryKey = [
  "administrador",
  "arquitectura",
] as const;

export function getCurrentArchitectureSnapshot(): ArchitectureSnapshot {
  const state = useAdminStore.getState();
  return {
    torres: state.torres,
    porterias: state.porterias,
    unidades: state.unidades,
    depositos: state.depositos,
  };
}

export async function fetchArchitectureSnapshot() {
  await delay(250);
  return getCurrentArchitectureSnapshot();
}

export async function createTowerRequest(
  data: Omit<Torre, "id" | "numero">,
) {
  await delay(250);
  return data;
}

export async function updateTowerRequest(data: Torre) {
  await delay(250);
  return data;
}

export async function deleteTowerRequest(data: Torre) {
  await delay(250);
  return data;
}

export async function createUnitRequest(data: Omit<Unidad, "id">) {
  await delay(250);
  return data;
}

export async function updateUnitRequest(data: Unidad) {
  await delay(250);
  return data;
}

export async function deleteUnitRequest(id: number) {
  await delay(250);
  return id;
}

export async function createDepositRequest(data: Omit<Deposito, "id">) {
  await delay(250);
  return data;
}

export async function updateDepositRequest(data: Deposito) {
  await delay(250);
  return data;
}

export async function deleteDepositRequest(id: number) {
  await delay(250);
  return id;
}

export async function createPorteriaRequest(data: Omit<Porteria, "id">) {
  await delay(250);
  return data;
}

export async function updatePorteriaRequest(data: Porteria) {
  await delay(250);
  return data;
}

export async function deletePorteriaRequest(id: number) {
  await delay(250);
  return id;
}
