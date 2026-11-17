import type { DatosDeLlamada } from "@/features/intercom/services/intercom.repo";

/**
 * Qué llamada por la app corresponde a lo elegido en «Llamar», o `null` si no
 * hay ninguna (23/10/2026; la administración entra el 28/10/2026).
 *
 * Por la app hay seis caminos, y los mismos decide la base en
 * `llamar_por_internet`:
 *
 *   · una vivienda llama a la portería o a la administración;
 *   · la portería llama a una vivienda o a la administración;
 *   · la administración llama a una vivienda o a la portería.
 *
 * Que el camino exista no quiere decir que se pueda: si al otro lado nadie
 * recibe llamadas por la app (`perfil.recibe_llamadas_app`), lo dice
 * `se_puede_llamar_por_la_app` y queda solo el teléfono.
 */
export function llamadaPorInternet(datos: {
  rolActivo: string | null;
  /**
   * Lo elegido en «¿A quién quieres llamar?»: `porteria:<id>`,
   * `administracion` o `vivienda` (el personal, que luego elige cuál).
   */
  destino: string;
  /** La vivienda elegida por el personal. */
  unidadId: string;
  /** La vivienda desde la que llama un vecino. */
  unidadActivaId: string | null | undefined;
  condominioId: string;
  /**
   * La persona de la vivienda elegida por el personal (17/11/2026). Vacío:
   * «Todos», suena en todos y contesta el primero. Solo cuenta al llamar a una
   * vivienda.
   */
  aUsuarioId?: string | null;
}): DatosDeLlamada | null {
  const { rolActivo, destino, unidadId, unidadActivaId, condominioId, aUsuarioId } = datos;
  const aLaPorteria = destino.startsWith("porteria:");
  const aLaAdministracion = destino === "administracion";

  if (rolActivo === "guardia" || rolActivo === "administrador") {
    if (rolActivo === "guardia" && aLaAdministracion) {
      return condominioId ? { destino: "administracion", condominioId } : null;
    }
    if (rolActivo === "administrador" && aLaPorteria) {
      return condominioId ? { destino: "porteria", condominioId } : null;
    }
    if (!unidadId) return null;
    return aUsuarioId
      ? { destino: "vivienda", aUnidadId: unidadId, aUsuarioId }
      : { destino: "vivienda", aUnidadId: unidadId };
  }

  if (!unidadActivaId) return null;
  if (aLaPorteria) return { destino: "porteria", desdeUnidadId: unidadActivaId };
  if (aLaAdministracion) return { destino: "administracion", desdeUnidadId: unidadActivaId };
  return null;
}

/** «Todos» en el selector de a quién de la vivienda: sin persona. */
export const TODOS_EN_LA_VIVIENDA = "";

/**
 * A quién de la vivienda se puede llamar por la app (17/11/2026, pedido del
 * cliente: «hoy solo sale el departamento»). Primero «Todos» --suena en todos
 * y contesta el primero-- y después cada persona con cuenta que recibe
 * llamadas por la app, sin repetir (alguien puede tener dos papeles en la
 * misma vivienda). Si nadie las recibe, la lista va vacía.
 */
export function quienesContestanEnLaVivienda(
  personas: Array<{ usuarioId: string | null; nombre: string; recibeLlamadasApp: boolean }>,
): Array<{ value: string; label: string }> {
  const vistas = new Set<string>();
  const una = personas.flatMap((p) => {
    if (!p.usuarioId || !p.recibeLlamadasApp || vistas.has(p.usuarioId)) return [];
    vistas.add(p.usuarioId);
    return [{ value: p.usuarioId, label: p.nombre.trim() || "Sin nombre" }];
  });
  if (una.length === 0) return [];
  return [{ value: TODOS_EN_LA_VIVIENDA, label: "Todos (contesta el primero)" }, ...una];
}
