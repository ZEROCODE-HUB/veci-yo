import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FILTROS_ESTADO } from "../constants";
import type { CorrespondenciaItem } from "@/shared/types";
import { useUIStore } from "@/stores/ui-store";
import {
  cambiarEstadoCorrespondencia,
  crearCorrespondencia,
  eliminarCorrespondencia,
  obtenerCorrespondencia,
  reportarIncidencia,
  type NuevaCorrespondencia,
} from "../services/correspondencia.repo";

export const correspondenciaQueryKey = ["correspondencia"] as const;

/**
 * Los datos viven en Supabase; React Query es la unica cache. Antes habia un
 * store de Zustand con los items y las mutaciones lo actualizaban a mano
 * ademas de invalidar la consulta, con dos copias del mismo dato.
 */
export function useCorrespondencia() {
  const queryClient = useQueryClient();
  const addToast = useUIStore((s) => s.addToast);

  const query = useQuery({
    queryKey: correspondenciaQueryKey,
    queryFn: obtenerCorrespondencia,
  });

  const invalidar = () => {
    void queryClient.invalidateQueries({ queryKey: correspondenciaQueryKey });
  };

  const alFallar = (error: unknown) =>
    addToast(
      error instanceof Error ? error.message : "No se pudo guardar el cambio",
      "error",
    );

  const crear = useMutation({
    mutationFn: (datos: NuevaCorrespondencia) => crearCorrespondencia(datos),
    onSuccess: invalidar,
    onError: alFallar,
  });

  const cambiarEstado = useMutation({
    mutationFn: ({
      uuid,
      estado,
      extras,
    }: {
      uuid: string;
      estado: CorrespondenciaItem["estado"];
      extras?: { entregadoA?: string };
    }) => cambiarEstadoCorrespondencia(uuid, estado, extras),
    onSuccess: invalidar,
    onError: alFallar,
  });

  const borrar = useMutation({
    mutationFn: (uuid: string) => eliminarCorrespondencia(uuid),
    onSuccess: invalidar,
    onError: alFallar,
  });

  const informar = useMutation({
    mutationFn: ({
      uuid,
      descripcion,
      fotos,
    }: {
      uuid: string;
      descripcion: string;
      fotos?: string[];
    }) => reportarIncidencia(uuid, descripcion, fotos),
    onSuccess: invalidar,
    onError: alFallar,
  });

  return {
    items: query.data ?? [],
    cargando: query.isLoading,
    error: query.error,
    agregar: crear.mutate,
    creando: crear.isPending,
    actualizarEstado: (
      uuid: string,
      estado: CorrespondenciaItem["estado"],
      extras?: { entregadoA?: string },
    ) => cambiarEstado.mutate({ uuid, estado, extras }),
    eliminar: (uuid: string) => borrar.mutate(uuid),
    reportarIncidencia: (uuid: string, descripcion: string, fotos?: string[]) =>
      informar.mutate({ uuid, descripcion, fotos }),
  };
}

export function useCorrespondenciaFiltros(items: CorrespondenciaItem[]) {
  const [search, setSearch] = useState("");
  const [estadoSeleccionados, setEstadoSeleccionados] = useState<string[]>([]);
  const [filterOpen, setFilterOpen] = useState(false);
  const [catFilter, setCatFilter] = useState("");
  const [entregaFilter, setEntregaFilter] = useState(false);
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");

  const toggleEstado = (value: string) =>
    setEstadoSeleccionados((current) =>
      current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value],
    );

  const toggleTodos = () =>
    setEstadoSeleccionados((current) =>
      current.length === 0 || current.length === FILTROS_ESTADO.length
        ? []
        : FILTROS_ESTADO.map((filter) => filter.value),
    );

  const filtered = useMemo(
    () =>
      items.filter((item) => {
        const normalized = search.toLowerCase();
        const matchSearch =
          !normalized ||
          item.nombre.toLowerCase().includes(normalized) ||
          item.empresa.toLowerCase().includes(normalized);
        const matchStatus =
          estadoSeleccionados.length === 0 ||
          estadoSeleccionados.includes(item.estado);
        const matchCategory = !catFilter || item.categoria === catFilter;
        const matchDelivery = !entregaFilter || item.entregaEnPuerta === true;
        return matchSearch && matchStatus && matchCategory && matchDelivery;
      }),
    [catFilter, entregaFilter, estadoSeleccionados, items, search],
  );

  return {
    filtered,
    search,
    setSearch,
    estadoSeleccionados,
    toggleEstado,
    toggleTodos,
    todosActivo:
      estadoSeleccionados.length === 0 ||
      estadoSeleccionados.length === FILTROS_ESTADO.length,
    filterOpen,
    setFilterOpen,
    fechaDesde,
    setFechaDesde,
    fechaHasta,
    setFechaHasta,
    catFilter,
    setCatFilter,
    entregaFilter,
    setEntregaFilter,
  };
}
