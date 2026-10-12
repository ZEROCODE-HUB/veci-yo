import type { UnidadDisponible } from "@/shared/hooks/useUnidadesDisponibles";

/**
 * A qué viviendas va un envío: las reglas del selector de portería.
 *
 * Vivían sueltas en la pantalla y estaban a medias. El piso se elegía y no
 * filtraba nada --con «Torre 2, piso 1» seguían saliendo la 205 y la 301--, lo
 * marcado en una torre seguía marcado al cambiar a otra sin verse, y la
 * selección viajaba por **código**, que se repite entre torres. Lo vio el
 * cliente el 12/10/2026.
 *
 * Aquí son funciones puras para poder invertirlas en una prueba, igual que
 * `filtroDePorteria` y por el mismo motivo.
 */

/** Los pisos que de verdad existen en esa torre; sin torre, los del edificio. */
export function pisosDe(unidades: UnidadDisponible[], torre?: string): string[] {
  return [
    ...new Set(
      unidades
        .filter((u) => !torre || u.torre === torre)
        .map((u) => String(u.piso)),
    ),
  ].sort((a, b) => Number(a) - Number(b));
}

/** Las viviendas que se ofrecen con lo elegido en torre y piso. */
export function unidadesVisibles(
  unidades: UnidadDisponible[],
  torre?: string,
  piso?: string,
): UnidadDisponible[] {
  return unidades.filter(
    (u) => (!torre || u.torre === torre) && (!piso || String(u.piso) === piso),
  );
}

/**
 * De lo marcado, lo que sigue a la vista.
 *
 * Una vivienda marcada que deja de verse al cambiar de torre no puede seguir
 * marcada: el envío se registraría para un departamento que la pantalla ya no
 * enseña.
 */
export function soloVisibles(
  seleccion: string[],
  visibles: UnidadDisponible[],
): string[] {
  const ids = new Set(visibles.map((u) => u.unidadId));
  return seleccion.filter((id) => ids.has(id));
}

export interface PermisoDeEntrega {
  condominioId: string;
  /** Vacío en la fila que vale para todo el edificio. */
  unidadId: string | null;
  entregaDirecta: boolean | null;
}

/**
 * De las viviendas elegidas, las que **no** tienen autorizada la entrega en
 * puerta.
 *
 * Es la misma cuenta que hace la base en `permisos_de_unidad`: manda lo
 * escrito para la vivienda y, si no dice nada, lo del edificio. Y la misma que
 * `respetar_entrega_directa`: si nadie ha dicho nada, no está prohibido.
 *
 * La base sigue siendo quien decide --el disparador rechaza el alta--; esto
 * existe para decirlo **antes** de pulsar, que es lo que faltaba: el
 * interruptor se ofrecía siempre y el motivo llegaba al final, en un aviso
 * rojo sobre un formulario ya lleno.
 */
export function sinEntregaEnPuerta(
  permisos: PermisoDeEntrega[],
  elegidas: UnidadDisponible[],
): UnidadDisponible[] {
  return elegidas.filter((unidad) => {
    const propia = permisos.find((p) => p.unidadId === unidad.unidadId);
    const delEdificio = permisos.find(
      (p) => p.unidadId === null && p.condominioId === unidad.condominioId,
    );
    const permitida =
      propia?.entregaDirecta ?? delEdificio?.entregaDirecta ?? null;
    return permitida === false;
  });
}

/** «205» o, cuando no se ha elegido torre y hay varias, «T2 · 205». */
export function etiquetaDeUnidad(
  unidad: UnidadDisponible,
  conTorre: boolean,
): string {
  return conTorre ? `T${unidad.torreNumero} · ${unidad.codigo}` : unidad.codigo;
}
