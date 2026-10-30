import type { CorrespondenciaItem } from "@/shared/types";

/**
 * Lo que decide qué se ve en la lista de correspondencia y qué se puede hacer
 * con cada envío.
 *
 * El cliente lo dijo el 12/10/2026: «a veces sí mostraba todo, a veces no, los
 * filtros a veces funcionaban y a veces no, y en los tres puntitos no entiendo
 * las opciones». Había tres cosas detrás:
 *
 *  · las dos fechas del filtro **no filtraban**: se elegían y nadie las leía;
 *  · los filtros de abajo --categoría, entrega en puerta, fechas-- seguían
 *    aplicados con el panel plegado, sin nada que lo dijera: la lista salía
 *    incompleta y no se veía por qué;
 *  · el menú ofrecía siempre lo mismo --«Estado: Portería», «Estado:
 *    Entregado»--, también el estado que el envío ya tenía.
 *
 * Son funciones puras para poder invertirlas en una prueba.
 */

export interface CriteriosDeCorrespondencia {
  busqueda: string;
  estados: string[];
  categoria: string;
  soloEntregaEnPuerta: boolean;
  /** `yyyy-MM-dd`, o vacío. */
  fechaDesde: string;
  /** `yyyy-MM-dd`, o vacío. */
  fechaHasta: string;
}

/** `dd/MM/yyyy` -> `yyyy-MM-dd`, que sí se puede comparar como texto. */
function aIso(fecha: string): string {
  const [dia, mes, anio] = fecha.split("/");
  return dia && mes && anio ? `${anio}-${mes}-${dia}` : "";
}

export function filtrarCorrespondencia(
  items: CorrespondenciaItem[],
  criterios: CriteriosDeCorrespondencia,
): CorrespondenciaItem[] {
  const buscado = criterios.busqueda.trim().toLowerCase();

  return items.filter((item) => {
    if (buscado) {
      // También por departamento: es por lo que busca la portería.
      const texto = [
        item.nombre,
        item.empresa,
        item.unidad,
        item.descripcion,
        item.ci,
      ]
        .join(" ")
        .toLowerCase();
      if (!texto.includes(buscado)) return false;
    }
    if (
      criterios.estados.length > 0 &&
      !criterios.estados.includes(item.estado)
    ) {
      return false;
    }
    if (criterios.categoria && item.categoria !== criterios.categoria) {
      return false;
    }
    if (criterios.soloEntregaEnPuerta && !item.entregaEnPuerta) return false;

    // El día que se ve en la tarjeta es el que se compara.
    const dia = aIso(item.fecha);
    if (criterios.fechaDesde && (!dia || dia < criterios.fechaDesde)) {
      return false;
    }
    if (criterios.fechaHasta && (!dia || dia > criterios.fechaHasta)) {
      return false;
    }
    return true;
  });
}

/** Cuántos filtros del panel plegable están puestos. */
export function filtrosOcultosActivos(
  criterios: CriteriosDeCorrespondencia,
): number {
  return [
    criterios.categoria,
    criterios.soloEntregaEnPuerta,
    criterios.fechaDesde,
    criterios.fechaHasta,
  ].filter(Boolean).length;
}

export type AccionDeCorrespondencia =
  | "recibir"
  | "notificar"
  | "entregar"
  | "devolver"
  | "informar"
  | "eliminar";

export interface OpcionDeCorrespondencia {
  accion: AccionDeCorrespondencia;
  etiqueta: string;
  peligrosa?: boolean;
}

/**
 * Lo que se puede hacer con un envío, **según dónde está**.
 *
 * No se ofrece dejarlo como ya está, y cada opción dice lo que hace en vez de
 * nombrar un estado.
 */
export function opcionesDeCorrespondencia(
  estado: CorrespondenciaItem["estado"],
): OpcionDeCorrespondencia[] {
  const opciones: OpcionDeCorrespondencia[] = [];
  if (estado === "No Recibido") {
    opciones.push({ accion: "recibir", etiqueta: "Ya llegó a portería" });
  }
  if (estado === "En Portería") {
    // Encima de «Marcar como entregado» (Para Claude 198, 30/10/2026).
    opciones.push({ accion: "notificar", etiqueta: "Notificado por otro medio" });
    opciones.push({ accion: "entregar", etiqueta: "Marcar como entregado" });
  }
  if (estado === "Entregado") {
    opciones.push({
      accion: "devolver",
      etiqueta: "No se entregó, sigue en portería",
    });
  }
  opciones.push({
    accion: "informar",
    etiqueta: "Reportar un problema con este envío",
  });
  opciones.push({
    accion: "eliminar",
    etiqueta: "Eliminar este registro",
    peligrosa: true,
  });
  return opciones;
}
