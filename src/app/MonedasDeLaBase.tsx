import { useEffect } from "react";
import { useMonedas } from "@/shared/hooks/useMonedas";
import { paisPorDefectoDeLaApp } from "@/shared/services/ajustesDeLaApp";
import { fijarPaisPorDefecto } from "@/shared/constants";

/**
 * Trae al arrancar lo que el formato y los formularios necesitan desde el
 * principio: cuántos decimales lleva cada moneda (`moneda.decimales`) y el
 * país que viene elegido por defecto (`pais_por_defecto`, 29/10/2026). No
 * pinta nada.
 */
export function MonedasDeLaBase() {
  useMonedas();
  useEffect(() => {
    paisPorDefectoDeLaApp()
      .then(fijarPaisPorDefecto)
      .catch(() => {});
  }, []);
  return null;
}
