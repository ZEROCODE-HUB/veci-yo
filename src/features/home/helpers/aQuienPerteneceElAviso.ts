import { PRESENTACION_DE_ROL } from "@/shared/constants/presentacionDeRoles";
import { nombreDeVivienda } from "@/shared/services/nombreDeVivienda";
import type { RolActivo, Ubicacion } from "@/shared/types";

/**
 * De qué vivienda y con qué rol es un aviso (10/11/2026, pedido del cliente).
 *
 * La bandeja es de la persona, así que quien administra el edificio y además
 * es propietaria del 102 recibe ahí los avisos de las dos cosas. «Tu visita
 * ingresó» no decía que era del 102, y al tocarlo entrando como
 * administración abría la lista de visitas de la administración.
 *
 * Con esto el aviso dice «Depto 102 · Propietario» o «Administración», y la
 * pantalla sabe si para abrirlo hay que cambiar de rol (o de vivienda).
 */
export interface PertenenciaDelAviso {
  rol: NonNullable<RolActivo>;
  /** La vivienda que hay que elegir, si el aviso es de una. */
  ubicacionId?: number;
  /** Lo que se lee en el aviso: «Depto 102 · Propietario». */
  etiqueta: string;
}

export function aQuienPerteneceElAviso(
  aviso: { unidadId?: string | null; deLaAdministracion?: boolean; deLaPorteria?: boolean },
  ubicaciones: Ubicacion[],
  roles: RolActivo[],
): PertenenciaDelAviso | null {
  if (aviso.deLaAdministracion && roles.includes("administrador")) {
    return { rol: "administrador", etiqueta: "Administración" };
  }
  if (aviso.deLaPorteria && roles.includes("guardia")) {
    return { rol: "guardia", etiqueta: "Portería" };
  }
  if (!aviso.unidadId) return null;
  const vivienda = ubicaciones.find((u) => u.unidadId === aviso.unidadId && u.rol);
  if (!vivienda?.rol) return null;
  return {
    rol: vivienda.rol,
    ubicacionId: vivienda.id,
    etiqueta: `${nombreDeVivienda(vivienda)} · ${PRESENTACION_DE_ROL[vivienda.rol].titulo}`,
  };
}

/**
 * Si abrir el aviso pide cambiar de rol o de vivienda: el rol es otro, o es el
 * mismo pero con otra vivienda elegida.
 */
export function hayQueCambiarParaVerlo(
  pertenece: PertenenciaDelAviso | null,
  rolActivo: RolActivo,
  ubicaciones: Ubicacion[],
): boolean {
  if (!pertenece) return false;
  if (pertenece.rol !== rolActivo) return true;
  if (pertenece.ubicacionId === undefined) return false;
  const activa = ubicaciones.find((u) => u.rol === rolActivo && u.favorito);
  return Boolean(activa && activa.id !== pertenece.ubicacionId);
}
