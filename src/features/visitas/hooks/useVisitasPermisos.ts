import { useMemo } from "react";
import type { RolActivo } from "@/shared/types";

/**
 * Quien ve que en la pantalla de Visitas.
 *
 * Es una funcion pura y no el cuerpo del hook para poder comprobarla sin
 * montar React: aqui viven decisiones como «filtrar por torre es para quien
 * mira el edificio entero», que se rompen agrupando roles de mas y no se ven
 * hasta que alguien abre la pantalla con el rol equivocado.
 */
export function permisosDeVisitas(
  rolActivo: RolActivo,
  ubicacionesCount: number,
  suscripcionActiva: boolean,
) {
  const esAdmin = rolActivo === "administrador";
  const esGuardia = rolActivo === "guardia";
  const esPropietario = rolActivo === "propietario";
  const esInquilinoLider = rolActivo === "inquilino-lider";
  const esHuesped = rolActivo === "huesped-temporal";
  const puedeCrear =
    esPropietario || esInquilinoLider || esGuardia || esAdmin || esHuesped;
  const puedeEliminar =
    esPropietario || esInquilinoLider || esGuardia || esAdmin;
  const accesoBloqueado = esPropietario && ubicacionesCount === 0;
  const sinCalendario = esGuardia || esAdmin;
  /*
    Filtrar por torre y departamento es para quien mira el edificio entero.
    El huesped estaba en la lista --seguramente arrastrado de la linea de
    `tiposDisponibles`, que si lo agrupa con el personal-- y tiene **un solo
    departamento**: se le ofrecian dos desplegables que solo pueden devolver
    lo que ya esta viendo, o nada.
  */
  const puedeFiltrarTorrePiso = esGuardia || esAdmin;
  const huespedDisponible =
    suscripcionActiva ||
    esGuardia ||
    esAdmin ||
    esHuesped ||
    (!esPropietario && !esInquilinoLider);

  const tiposDisponibles =
    esGuardia || esHuesped || esAdmin
      ? ["amigos", "temporal"]
      : ["amigos", "temporal", "permanente", "huesped-temporal"];

  const tipoTabs = (() => {
    // Sin reservas de huésped habría dos pestañas con el mismo contenido, así
    // que entonces no se ofrece "Todos": no hay nada que reunir.
    if (esHuesped || !huespedDisponible) {
      return [{ value: "visitas", label: "Visitas" }];
    }
    return [
      { value: "todos", label: "Todos" },
      { value: "visitas", label: "Visitas" },
      { value: "huespedes", label: "Huéspedes" },
    ];
  })();

  /*
    Una barra de una sola pestaña no puede hacer nada: se pinta «Visitas»,
    se pulsa «Visitas», y sigue en «Visitas». La pantalla la enseñaba igual.
  */
  const mostrarTipoTabs = tipoTabs.length > 1;

  return {
    esAdmin,
    esGuardia,
    esPropietario,
    esInquilinoLider,
    esHuesped,
    puedeCrear,
    puedeEliminar,
    accesoBloqueado,
    sinCalendario,
    puedeFiltrarTorrePiso,
    huespedDisponible,
    tiposDisponibles,
    tipoTabs,
    mostrarTipoTabs,
  };
}

/** El hook: la misma decisión, memorizada. */
export function useVisitasPermisos(
  rolActivo: RolActivo,
  ubicacionesCount: number,
  suscripcionActiva: boolean,
) {
  return useMemo(
    () => permisosDeVisitas(rolActivo, ubicacionesCount, suscripcionActiva),
    [rolActivo, ubicacionesCount, suscripcionActiva],
  );
}
