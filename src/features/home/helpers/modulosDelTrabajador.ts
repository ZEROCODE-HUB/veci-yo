/**
 * Los módulos que ve el profesional permanente en «Viviendas» (20/11/2026,
 * pedido del cliente: el mismo menú que los demás roles, con solo lo suyo).
 *
 *   · Anuncios, siempre, rotulado sin «encuestas»: no vota.
 *   · Visitas, solo si quien lo registró le dio permiso de crearlas.
 *
 * Genérico sobre el módulo para no arrastrar las imágenes de `constants` a
 * las pruebas.
 */
export function modulosDelTrabajador<M extends { id: string; label: string }>(
  modulos: readonly M[],
  puedeCrearVisitas: boolean,
): M[] {
  return modulos
    .filter((m) => m.id === "anuncios" || (m.id === "visitas" && puedeCrearVisitas))
    .map((m) => (m.id === "anuncios" ? { ...m, label: "Anuncios" } : m));
}
