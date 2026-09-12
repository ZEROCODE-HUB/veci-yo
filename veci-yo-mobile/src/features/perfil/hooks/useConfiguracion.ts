import { usePerfilStore } from '@/stores/perfil-store';

export function useConfiguracion() {
  const configuracionApp = usePerfilStore((state) => state.configuracionApp);
  const actualizarConfiguracionApp = usePerfilStore((state) => state.actualizarConfiguracionApp);
  const pausarCuenta = usePerfilStore((state) => state.pausarCuenta);
  return { configuracionApp, actualizarConfiguracionApp, pausarCuenta };
}

