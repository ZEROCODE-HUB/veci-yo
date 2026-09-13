import { useAdminStore } from "@/stores";
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
export async function fetchDirectorioRequest() { await delay(150); const { unidades, tipologias, depositos } = useAdminStore.getState(); return { unidades, tipologias, depositos }; }
export async function marcarPagosRequest(unidadIds: number[]) { await delay(200); return unidadIds; }
