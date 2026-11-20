import type { RolActivo } from "@/shared/types";

interface MembresiaDeEdificio {
  condominioId: string;
  rol: string;
}
interface Vivienda {
  unidadId?: string;
  condominioId?: string;
}

/**
 * El edificio en el que trabaja el rol activo (20/11/2026).
 *
 * Se tomaba el primer edificio de la lista, sin mirar el rol. Con alguien que
 * administra un edificio y es guardia en otro, la primera membresía podía ser
 * la de guardia: como administradora creaba zonas, viviendas e índices **en el
 * edificio equivocado**, la base lo rechazaba («No se pudo guardar el cambio»)
 * y las listas mezclaban viviendas de los dos. Lo vio el cliente con la cuenta
 * multirol.
 *
 *   · administración → el edificio que administra (o coadministra);
 *   · portería       → el edificio donde es guardia;
 *   · los de vivienda → el edificio de la vivienda elegida arriba.
 */
export function condominioDelRol(
  rolActivo: RolActivo | null,
  condominios: readonly MembresiaDeEdificio[],
  unidades: readonly { unidadId: string; condominioId: string }[],
  viviendaElegida: Vivienda | undefined,
): string | null {
  if (rolActivo === "administrador") {
    const admin =
      condominios.find((c) => c.rol === "administrador") ??
      condominios.find((c) => c.rol === "coadministrador");
    if (admin) return admin.condominioId;
  }
  if (rolActivo === "guardia") {
    const guardia = condominios.find((c) => c.rol === "guardia");
    if (guardia) return guardia.condominioId;
  }
  if (rolActivo && rolActivo !== "administrador" && rolActivo !== "guardia") {
    if (viviendaElegida?.condominioId) return viviendaElegida.condominioId;
    const deLaVivienda = unidades.find((u) => u.unidadId === viviendaElegida?.unidadId);
    if (deLaVivienda) return deLaVivienda.condominioId;
    if (unidades[0]) return unidades[0].condominioId;
  }
  return condominios[0]?.condominioId ?? unidades[0]?.condominioId ?? null;
}
