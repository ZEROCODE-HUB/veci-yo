import type { useZonaDetalles } from "../../hooks/useZonaDetalles";

/** El estado del detalle de una zona: lo que devuelve `useZonaDetalles`. */
export type DetalleDeZona = ReturnType<typeof useZonaDetalles>;
