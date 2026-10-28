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
}): DatosDeLlamada | null {
  const { rolActivo, destino, unidadId, unidadActivaId, condominioId } = datos;
  const aLaPorteria = destino.startsWith("porteria:");
  const aLaAdministracion = destino === "administracion";

  if (rolActivo === "guardia" || rolActivo === "administrador") {
    if (rolActivo === "guardia" && aLaAdministracion) {
      return condominioId ? { destino: "administracion", condominioId } : null;
    }
    if (rolActivo === "administrador" && aLaPorteria) {
      return condominioId ? { destino: "porteria", condominioId } : null;
    }
    return unidadId ? { destino: "vivienda", aUnidadId: unidadId } : null;
  }

  if (!unidadActivaId) return null;
  if (aLaPorteria) return { destino: "porteria", desdeUnidadId: unidadActivaId };
  if (aLaAdministracion) return { destino: "administracion", desdeUnidadId: unidadActivaId };
  return null;
}
