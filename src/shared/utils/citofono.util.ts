/**
 * Cómo se llama la llamada por la app en cada país (09/11/2026, Correcciones
 * fila 9): en Colombia el aparato de la portería es el «citófono»; en Perú,
 * el «intercomunicador». Se dice igual en todas las pantallas que llaman.
 *
 * El país es el del edificio (`condominio.pais`, dos letras). Sin saberlo, el
 * de Colombia, que es donde están los edificios hoy.
 */
export function nombreDelCitofono(pais: string | null | undefined): string {
  return (pais ?? "").trim().toUpperCase() === "PE"
    ? "Intercomunicador Virtual"
    : "Citófono Virtual";
}
