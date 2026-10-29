import { useMonedas } from "@/shared/hooks/useMonedas";

/**
 * Trae las monedas al arrancar, para que el formato de dinero sepa desde el
 * principio cuántos decimales lleva cada una (`moneda.decimales`). No pinta
 * nada.
 */
export function MonedasDeLaBase() {
  useMonedas();
  return null;
}
