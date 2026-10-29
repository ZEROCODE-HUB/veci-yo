import type { OpcionDeLista } from "@/shared/hooks/useLista";

/**
 * Los tipos de PQRS que ofrece un área (28/10/2026).
 *
 * Cada área de `areas_de_pqrs` dice en `extra.tipos` qué tipos admite, por
 * código; los nombres y el orden son los de `tipos_de_pqrs`. Vivía en
 * `TIPOS_POR_AREA`, escrito a mano. Un tipo apagado no se ofrece aunque el
 * área lo nombre, y un área sin tipos --«Constructora», «Documentos
 * antiguos»-- devuelve la lista vacía: el formulario esconde entonces el
 * selector.
 *
 * Pura y con las listas por parámetro, para poder probarla sin la base.
 */
export function tiposDelArea(
  area: OpcionDeLista | undefined,
  tipos: OpcionDeLista[],
): OpcionDeLista[] {
  const admitidos = area?.extra.tipos;
  if (!Array.isArray(admitidos)) return [];
  return tipos.filter((t) => t.activo && admitidos.includes(t.codigo));
}
