import { useMemo } from "react";
import type { RolActivo } from "@/shared/types";

export function useVisitasPermisos(
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
  const puedeFiltrarTorrePiso = esGuardia || esAdmin || esHuesped;
  const huespedDisponible =
    suscripcionActiva ||
    esGuardia ||
    esAdmin ||
    esHuesped ||
    (!esPropietario && !esInquilinoLider);

  const tiposDisponibles = useMemo(() => {
    if (esGuardia || esHuesped || esAdmin) return ["amigos", "temporal"];
    return ["amigos", "temporal", "permanente", "huesped-temporal"];
  }, [esGuardia, esHuesped, esAdmin]);

  const tipoTabs = useMemo(() => {
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
  }, [esHuesped, huespedDisponible]);

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
  };
}
