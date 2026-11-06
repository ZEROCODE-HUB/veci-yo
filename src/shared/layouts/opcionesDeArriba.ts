import type { MembresiaCondominio } from "@/shared/services/sesion";
import { etiquetaDeRol, nombreDeVivienda } from "@/shared/services/nombreDeVivienda";
import { PRESENTACION_DE_ROL } from "@/shared/constants/presentacionDeRoles";
import type { RolActivo, Ubicacion } from "@/shared/types";

/** Una fila del desplegable de arriba: un rol en un sitio. */
export interface OpcionDeArriba {
  clave: string;
  /** «Admin · Green Tower 2», «Propietario no residente · Green Tower 2 · 103». */
  etiqueta: string;
  rol: NonNullable<RolActivo>;
  /** La vivienda que se elige con esa fila; los roles de edificio no tienen. */
  ubicacionId?: number;
  activa: boolean;
}

/*
  El desplegable de la barra es una sola lista de «rol · sitio», y elegir una
  fila cambia de rol, de vivienda o de las dos cosas (pedido del cliente,
  06/11/2026: «solo el rol y la propiedad y ya»).

  La primera versión del mismo día listaba las viviendas con la etiqueta del
  rol activo delante --a una administradora le salía «Administrador, Green
  Tower 2» dos veces, que eran sus dos filas de propietaria-- y debajo una
  sección «Cambiar de rol». Aquí cada fila lleva **su** rol: el de la
  membresía del edificio o el de la vivienda.
*/
export function opcionesDeArriba({
  rolActivo,
  rolesDisponibles,
  condominios,
  ubicaciones,
  ubicacionActivaId,
}: {
  rolActivo: RolActivo;
  rolesDisponibles: RolActivo[];
  condominios: MembresiaCondominio[];
  ubicaciones: Ubicacion[];
  ubicacionActivaId?: number;
}): OpcionDeArriba[] {
  const opciones: OpcionDeArriba[] = [];
  const vistas = new Set<string>();

  for (const c of condominios) {
    const rol: NonNullable<RolActivo> | null =
      c.rol === "guardia"
        ? "guardia"
        : c.rol === "administrador" || c.rol === "coadministrador"
          ? "administrador"
          : null;
    if (!rol || !rolesDisponibles.includes(rol)) continue;
    const clave = `${rol}:${c.condominioId}`;
    if (vistas.has(clave)) continue;
    // La barra nombra el primer edificio del rol: esa es la fila activa.
    const primeraDelRol = !opciones.some((o) => o.rol === rol);
    vistas.add(clave);
    opciones.push({
      clave,
      etiqueta: `${rol === "guardia" ? "Guardia" : "Admin"} · ${c.condominioNombre}`,
      rol,
      activa: rolActivo === rol && primeraDelRol,
    });
  }

  for (const u of ubicaciones) {
    // Una vivienda sin rol anotado es del rol con que se entró (datos viejos).
    const rolDeLaVivienda = u.rol ?? rolActivo;
    if (!rolDeLaVivienda) continue;
    if (rolDeLaVivienda === "administrador" || rolDeLaVivienda === "guardia") continue;
    const clave = `${rolDeLaVivienda}:${u.id}`;
    if (vistas.has(clave)) continue;
    vistas.add(clave);
    const rol =
      etiquetaDeRol(rolDeLaVivienda) || PRESENTACION_DE_ROL[rolDeLaVivienda].titulo;
    opciones.push({
      clave,
      etiqueta: `${rol} · ${nombreDeVivienda(u)}`,
      rol: rolDeLaVivienda,
      ubicacionId: u.id,
      activa: rolActivo === rolDeLaVivienda && u.id === ubicacionActivaId,
    });
  }

  return opciones;
}
