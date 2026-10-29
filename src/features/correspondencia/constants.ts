/**
 * Vocabulario de la interfaz de correspondencia.
 *
 * Las torres, pisos y unidades que vivian aqui eran listas fijas y ya salen de
 * `useUnidadesDisponibles`. `CATEGORIAS` y `ESTADOS_ENCOMIENDA` salen de los
 * enums de la base. Las empresas de mensajeria son la lista
 * `empresas_de_mensajeria` de la base (29/10/2026), y lo que se guarda sigue
 * siendo texto libre: con «Otro» se escribe la que no este.
 */
import {
  CATEGORIA_CORRESPONDENCIA,
  ESTADO_ENCOMIENDA,
  etiquetasDe,
} from "@/shared/constants";

export const CATEGORIAS = etiquetasDe(CATEGORIA_CORRESPONDENCIA);
export const ESTADOS_ENCOMIENDA = etiquetasDe(ESTADO_ENCOMIENDA);

export const FILTROS_ESTADO = [
  { value: 'No Recibido', label: 'No recibido', color: '#111827' },
  { value: 'En Portería', label: 'En portería', color: '#CA8A04' },
  { value: 'Entregado', label: 'Entregado', color: '#6B7280' },
] as const;

