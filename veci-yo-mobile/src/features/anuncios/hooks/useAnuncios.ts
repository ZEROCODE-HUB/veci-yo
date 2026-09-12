import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/stores";
import { useAnunciosStore } from "../stores/anuncios.store";
import {
  createAnuncioRequest,
  fetchAnunciosRequest,
} from "../services/anuncios.service";
import type { AnunciosFiltros } from "../types/anuncios";

export const anunciosQueryKey = ["anuncios"] as const;

export function useAnuncios() {
  const rolActivo = useAuthStore((state) => state.rolActivo);
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: anunciosQueryKey,
    queryFn: fetchAnunciosRequest,
    initialData: useAnunciosStore.getState().anuncios,
  });

  const [filtros, setFiltros] = useState<AnunciosFiltros>({
    search: "",
    fechaDesde: null,
    fechaHasta: null,
    categoria: "",
    encuestaActiva: false,
  });

  const mutation = useMutation({
    mutationFn: createAnuncioRequest,
    onSuccess: (anuncio) => {
      useAnunciosStore.getState().agregarAnuncio(anuncio);
      void queryClient.invalidateQueries({ queryKey: anunciosQueryKey });
    },
  });

  const anuncios = useMemo(
    () =>
      (query.data || []).filter((anuncio) => {
        const search = filtros.search.toLowerCase();
        const matchSearch =
          !search ||
          anuncio.titulo.toLowerCase().includes(search) ||
          anuncio.categoria.toLowerCase().includes(search) ||
          anuncio.descripcion.toLowerCase().includes(search);
        const matchCategoria =
          !filtros.categoria || anuncio.categoria === filtros.categoria;
        const matchEncuesta = !filtros.encuestaActiva || anuncio.votacion;
        const matchAudiencia =
          rolActivo !== "huesped-temporal" ||
          (anuncio.paraHuespedes === true && !anuncio.votacion);
        return matchSearch && matchCategoria && matchEncuesta && matchAudiencia;
      }),
    [filtros, query.data, rolActivo],
  );

  const updateFiltro = <K extends keyof AnunciosFiltros>(
    key: K,
    value: AnunciosFiltros[K],
  ) => setFiltros((current) => ({ ...current, [key]: value }));
  return {
    ...query,
    anuncios,
    filtros,
    updateFiltro,
    publicarAnuncio: mutation.mutate,
    publicando: mutation.isPending,
  };
}

export function useAnuncioDetalle(id: string) {
  return useQuery({
    queryKey: [...anunciosQueryKey, id],
    queryFn: async () =>
      useAnunciosStore
        .getState()
        .anuncios.find((item) => String(item.id) === id),
    initialData: useAnunciosStore
      .getState()
      .anuncios.find((item) => String(item.id) === id),
  });
}
