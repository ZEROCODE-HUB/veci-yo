import { useMemo, useState } from "react";
import { TIPO_LABELS } from "@/data";
import type { VisitaItem } from "@/shared/types";
import { toComparableDate } from "../utils";

export function useVisitasHistorial(items: VisitaItem[]) {
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<string | null>("Todas");
  const [tipoTab, setTipoTab] = useState<string | null>("visitas");
  const [vistaSub, setVistaSub] = useState<"lista" | "calendario">("lista");
  const [filterOpen, setFilterOpen] = useState(false);
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [tipoFilter, setTipoFilter] = useState("Todos");
  const [torreFilter, setTorreFilter] = useState("");
  const [deptoFilter, setDeptoFilter] = useState("");

  const filteredItems = useMemo(
    () =>
      items.filter((item) => {
        const belongsToTab =
          tipoTab === "visitas"
            ? item.tipo !== "huesped-temporal"
            : item.tipo === "huesped-temporal";
        if (!belongsToTab) return false;

        const term = search.trim().toLowerCase();
        const matchesSearch =
          !term ||
          item.nombre?.toLowerCase().includes(term) ||
          item.ci?.toLowerCase().includes(term) ||
          item.invitados?.some((guest) =>
            guest.nombre?.toLowerCase().includes(term),
          );
        if (!matchesSearch) return false;

        if (activeTab && activeTab !== "Todas" && item.estado !== activeTab)
          return false;
        if (tipoFilter && tipoFilter !== "Todos") {
          const type = Object.entries(TIPO_LABELS).find(
            ([, label]) => label === tipoFilter,
          )?.[0];
          if (type && item.tipo !== type) return false;
        }

        const start = toComparableDate(item.fechaDesde);
        const end = toComparableDate(item.fechaHasta || item.fechaDesde);
        if (fechaDesde && start && start < fechaDesde) return false;
        if (fechaHasta && end && end > fechaHasta) return false;
        if (torreFilter && item.torre !== torreFilter) return false;
        if (deptoFilter && item.depto !== deptoFilter) return false;
        return true;
      }),
    [
      items,
      tipoTab,
      search,
      activeTab,
      tipoFilter,
      fechaDesde,
      fechaHasta,
      torreFilter,
      deptoFilter,
    ],
  );

  const hasActiveFilters = Boolean(
    search ||
    (activeTab && activeTab !== "Todas") ||
    (tipoFilter && tipoFilter !== "Todos") ||
    fechaDesde ||
    fechaHasta ||
    torreFilter ||
    deptoFilter,
  );

  const clearFilters = () => {
    setSearch("");
    setActiveTab("Todas");
    setFechaDesde("");
    setFechaHasta("");
    setTipoFilter("Todos");
    setTorreFilter("");
    setDeptoFilter("");
  };

  return {
    search,
    setSearch,
    activeTab,
    setActiveTab,
    tipoTab,
    setTipoTab,
    vistaSub,
    setVistaSub,
    filterOpen,
    setFilterOpen,
    fechaDesde,
    setFechaDesde,
    fechaHasta,
    setFechaHasta,
    tipoFilter,
    setTipoFilter,
    torreFilter,
    setTorreFilter,
    deptoFilter,
    setDeptoFilter,
    filteredItems,
    hasActiveFilters,
    clearFilters,
  };
}
