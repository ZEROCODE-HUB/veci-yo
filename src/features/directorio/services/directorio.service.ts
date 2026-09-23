import { useAdminStore } from "@/stores";
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
export async function fetchDirectorioRequest() { await delay(150); const { unidades, tipologias, depositos } = useAdminStore.getState(); return { unidades, tipologias, depositos }; }
// `marcarPagosRequest` estaba aqui: `await delay(200); return unidadIds;`.
// La carga masiva de pagos la hace ahora `marcar_pagos_cuota` en la base.
