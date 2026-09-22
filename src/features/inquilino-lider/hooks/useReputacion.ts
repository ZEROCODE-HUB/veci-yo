import { useReputacionUsuario } from "@/features/home/hooks/useReputacionUsuario";

/**
 * Insignias del usuario actual.
 *
 * Antes leia un array fijo de `constants`. Ahora sale de `reconocimiento`,
 * que cuenta cuantas veces se otorgo cada insignia a esa persona en ese
 * condominio. Sin niveles ni progresion: decision del 21/07/2026.
 */
export function useReputacion() {
  const insignias = useReputacionUsuario();
  return { insignias, isLoading: false };
}
