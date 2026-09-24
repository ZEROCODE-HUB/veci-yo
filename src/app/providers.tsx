import {
  MutationCache,
  QueryCache,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import { useUIStore } from "@/stores/ui-store";

/**
 * Una consulta que falla se ve, aunque la pantalla no la mire.
 *
 * El módulo de correspondencia estuvo roto desde el principio sin que nadie lo
 * notara: su consulta devolvía 400 y la pantalla pintaba `data ?? []`, así que
 * el fallo se veía **exactamente igual** que un edificio sin paquetes. No es un
 * descuido de esa pantalla: hay doce hooks que devuelven los datos sin exponer
 * el error, de modo que la pantalla no podría distinguirlos ni queriendo.
 *
 * Arreglarlo pantalla por pantalla son doce sitios y doce textos; ponerlo aquí
 * es uno, y cubre también el que se escriba mañana. El aviso no reemplaza a un
 * estado vacío bien escrito —la correspondencia ya lo tiene— pero garantiza que
 * un fallo nunca pase por "no hay nada".
 */
const queryCache = new QueryCache({
  onError: (error) => {
    const detalle = error instanceof Error ? error.message : "";
    useUIStore.getState().addToast(
      detalle
        ? `No se pudieron cargar los datos: ${detalle}`
        : "No se pudieron cargar los datos",
      "error",
    );
  },
});

/**
 * Decide si un fallo de escritura lo avisa el sitio central o ya lo avisa el
 * suyo. Se saca aparte para poder probarla: la regla es la que importa, no el
 * cableado de React Query.
 */
export function avisaElCentro(opciones?: { onError?: unknown }): boolean {
  return typeof opciones?.onError !== "function";
}

/**
 * Y una escritura que falla se ve **siempre**, que es peor que una lectura.
 *
 * Una consulta que falla deja la pantalla vacía; una mutación que falla deja a
 * la persona creyendo que guardó. Las consultas ya estaban cubiertas aquí
 * arriba y las escrituras no: quedaban quince repartidas por ocho hooks --el
 * chat, las notificaciones, las ubicaciones del inquilino líder, los reclamos,
 * el registro, la recuperación, la verificación y los servicios-- que fallaban
 * sin decir nada.
 *
 * Las sesenta y cinco que ya traen su propio `onError` siguen mandando: este
 * aviso se calla cuando la mutación tiene el suyo, para no sacar dos.
 */
const mutationCache = new MutationCache({
  onError: (error, _variables, _context, mutation) => {
    if (!avisaElCentro(mutation.options)) return;
    const detalle = error instanceof Error ? error.message : "";
    useUIStore
      .getState()
      .addToast(
        detalle ? `No se pudo guardar: ${detalle}` : "No se pudo guardar",
        "error",
      );
  },
});

const queryClient = new QueryClient({
  queryCache,
  mutationCache,
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
    },
  },
});

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
