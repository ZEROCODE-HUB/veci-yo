import {
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

const queryClient = new QueryClient({
  queryCache,
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
