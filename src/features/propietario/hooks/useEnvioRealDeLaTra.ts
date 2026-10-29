import { useParametrosDeLaBase } from "@/shared/hooks/useParametrosDeLaBase";

/**
 * Si el envío real al ministerio está encendido **en todo Veciyo**.
 *
 * Decisión del cliente del 09/10/2026: «por ahora que esté en SIMULACIÓN, pero
 * que deje escribir el TRA; eso debe funcionar SIMULADO PARA TODOS». O sea que
 * un anfitrión ya puede guardar su token y recorrer el flujo entero, y nada
 * sale al MinCIT.
 *
 * Es el ajuste `tra_envio_real` (Panel › Ajustes) desde el 28/10/2026; antes
 * era la variable `EXPO_PUBLIC_TRA_ACTIVO`. **Esto no es lo que decide**: lo
 * decide el mismo ajuste dentro de la función `reportar-tra`, que es la última
 * puerta antes del `fetch`. Aquí solo decide **qué ofrece la pantalla**: con
 * el envío apagado, el interruptor de armar no se enseña, porque un control
 * que no puede hacer lo que promete es decorativo.
 *
 * Mientras el ajuste no ha llegado se da por apagado: enseñar «simulación» un
 * instante de más no hace daño; enseñar el interruptor de armar, sí.
 */
export function useEnvioRealDeLaTra(): boolean {
  const parametros = useParametrosDeLaBase();
  return parametros.listo && parametros.booleano("tra_envio_real");
}
