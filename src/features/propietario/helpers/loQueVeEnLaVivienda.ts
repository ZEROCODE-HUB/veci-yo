import type { Database } from "@/shared/types/database.types";

type RolUnidad = Database["public"]["Enums"]["rol_unidad"];

/**
 * Qué se le ofrece en Viviendas › Configuración según su rol en la vivienda
 * activa.
 *
 *   · Gestionar la vivienda --contratos, servicios, el permiso de visitas de
 *     los huéspedes-- es del propietario y del inquilino líder: es lo que dice
 *     `puede_invitar_a_unidad` en la base.
 *   · La renta corta la configura además el anfitrión (`coadministrador`):
 *     lo dice `puede_configurar_alojamiento` (hueco 21, 15/10/2026).
 *   · Invitar lo decide el rol desde el panel (huecos 9 y 14, 26/10/2026); el
 *     propietario siempre puede.
 *   · El residente ve solo lo de vivir ahí (17/11/2026, plan aprobado por el
 *     cliente): ni invitar, ni el anfitrión, ni la renta corta, ni contratos o
 *     servicios. Es la misma vista de inquilino líder con menos entradas, no
 *     un rol nuevo. `corresidente` por si una versión vieja aún lo trae:
 *     desde ese día ya no queda ninguno.
 */
export function loQueVeEnLaVivienda(
  rol: RolUnidad | null | undefined,
  /** Si el panel le deja invitar a la vivienda a su rol. */
  invitarPorPermiso: boolean,
) {
  const esSoloResidente = rol === "residente" || rol === "corresidente";
  const puedeGestionarLaVivienda = rol === "propietario" || rol === "inquilino_lider";
  return {
    esSoloResidente,
    puedeGestionarLaVivienda,
    puedeConfigurarElAlojamiento: puedeGestionarLaVivienda || rol === "coadministrador",
    puedeInvitar: !esSoloResidente && (rol === "propietario" || invitarPorPermiso),
  };
}
