/**
 * Dónde tocó la persona por última vez (25/11/2026). Los menús «⋮» se abren
 * pegados al botón que los abrió, como los desplegables (pedido del cliente):
 * hay una decena de botones distintos que abren la misma hoja de opciones, y
 * en vez de enseñarle a cada uno a medirse, la raíz de la app apunta cada
 * toque y la hoja que se abre justo después lo toma.
 */
let toque: { x: number; y: number; en: number } | null = null;

export function registrarToque(x: number, y: number) {
  if (Number.isFinite(x) && Number.isFinite(y)) toque = { x, y, en: Date.now() };
}

/** El toque de hace un momento, si lo hay. Se consume: solo lo usa una hoja. */
export function tomarToqueReciente(margenMs = 900): { x: number; y: number } | null {
  if (!toque || Date.now() - toque.en > margenMs) return null;
  const { x, y } = toque;
  toque = null;
  return { x, y };
}
