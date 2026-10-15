import type { MembresiaCondominio } from "@/shared/services/sesion";

/**
 * Las tarjetas del panel de administración que puede usar quien lo abre
 * (15/10/2026, hueco 32).
 *
 * El coadministrador veía las siete aunque sus permisos no le dejaran usar
 * algunas: entraba y la pantalla fallaba sin explicar por qué. La regla es la
 * de la base, `puede_coadmin`: el administrador todo, y el coadministrador lo
 * que su permiso diga --sin la clave anotada, permitido--. Coadministradores
 * solo el administrador: un coadministrador no nombra a otro.
 */
const PERMISO_DE: Record<string, string | "solo-administrador"> = {
  seguridad: "modificarSeguridad",
  canales: "contestarChat",
  coadministradores: "solo-administrador",
};

export function opcionesDeAdministracion<T extends { key: string }>(
  opciones: readonly T[],
  membresia: Pick<MembresiaCondominio, "rol" | "permisos"> | undefined,
): T[] {
  if (!membresia || membresia.rol === "administrador") return [...opciones];
  return opciones.filter((opcion) => {
    const permiso = PERMISO_DE[opcion.key];
    if (!permiso) return true;
    if (permiso === "solo-administrador") return false;
    return membresia.permisos?.[permiso] !== false;
  });
}
