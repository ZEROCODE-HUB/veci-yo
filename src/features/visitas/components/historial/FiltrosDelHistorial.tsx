import React from "react";
import { VisitaFilters } from "../VisitaFilters";
import type { useVisitasHistorial } from "../../hooks";

/**
 * Los filtros de la lista de visitas, conectados al estado del historial.
 * Salió de `VisitasHistorialScreen` el 26/10/2026.
 */
export function FiltrosDelHistorial({
  historial: h,
  puedeFiltrarTorrePiso,
}: {
  historial: ReturnType<typeof useVisitasHistorial>;
  puedeFiltrarTorrePiso: boolean;
}) {
  return (
    <VisitaFilters
      search={h.search}
      onSearchChange={h.setSearch}
      activeTab={h.activeTab}
      onTabChange={h.setActiveTab}
      showStatusTabs={h.tipoTab !== "visitas"}
      filterOpen={h.filterOpen}
      onToggleFilterOpen={() => h.setFilterOpen(!h.filterOpen)}
      fechaDesde={h.fechaDesde}
      onFechaDesdeChange={h.setFechaDesde}
      fechaHasta={h.fechaHasta}
      onFechaHastaChange={h.setFechaHasta}
      tipoFilter={h.tipoFilter}
      onTipoFilterChange={h.setTipoFilter}
      torreFilter={h.torreFilter}
      onTorreFilterChange={h.setTorreFilter}
      deptoFilter={h.deptoFilter}
      onDeptoFilterChange={h.setDeptoFilter}
      canFilterTower={puedeFiltrarTorrePiso}
      showCategoriaFilter={h.tipoTab !== "huespedes"}
      algumFiltroAtivo={h.hasActiveFilters}
      onLimpiarFiltros={h.clearFilters}
    />
  );
}
