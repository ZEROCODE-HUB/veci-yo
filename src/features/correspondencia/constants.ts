/**
 * Vocabulario de la interfaz de correspondencia.
 *
 * Las torres, pisos y unidades que vivian aqui eran listas fijas y ya salen de
 * `useUnidadesDisponibles`. `CATEGORIAS`, `LOGISTICAS` y `ESTADOS_ENCOMIENDA`
 * duplican enums de la base (`categoria_correspondencia`, `estado_encomienda`):
 * pendiente derivarlas de ahi.
 */

export const CATEGORIAS = ['Delivery', 'Sobres', 'Paquetería'] as const;
export const LOGISTICAS = ['Rappi', 'DHL', 'Fedex', 'Expreso el pájaro', 'Otro'] as const;
export const ESTADOS_ENCOMIENDA = ['Buen estado', 'Estado intermedio', 'Mal estado'] as const;

export const FILTROS_ESTADO = [
  { value: 'No Recibido', label: 'No recibido', color: '#111827' },
  { value: 'En Portería', label: 'En portería', color: '#CA8A04' },
  { value: 'Entregado', label: 'Entregado', color: '#6B7280' },
] as const;

