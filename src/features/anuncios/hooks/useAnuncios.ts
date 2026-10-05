import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/stores";
import { useUIStore } from "@/stores/ui-store";
import { useCondominioActivo } from "@/shared/hooks";
import { nombreDeVecino } from "@/shared/services/nombreDeVecino";
import {
  crearAnuncio,
  detalleVotacion,
  eliminarAnuncio,
  miVoto,
  obtenerAnuncios,
  pendientesVotacion,
  votar,
  type NuevoAnuncio,
} from "../services/anuncios.repo";
import type { Anuncio, AnunciosFiltros } from "../types/anuncios";
import { mensajeDeError } from "@/shared/utils/error.util";

export const anunciosQueryKey = ["anuncios"] as const;

export function useAnuncios() {
  const rolActivo = useAuthStore((state) => state.rolActivo);
  const queryClient = useQueryClient();

  const condominioId = useCondominioActivo() ?? "";
  // En un condominio el voto pertenece a la unidad, no solo a la persona: es lo
  // que permite contar un voto por departamento y saber quien falta votar.
  const unidadesPropias = useAuthStore((s) => s.unidades);
  const addToast = useUIStore((s) => s.addToast);

  const query = useQuery({
    queryKey: anunciosQueryKey,
    queryFn: obtenerAnuncios,
  });

  const [filtros, setFiltros] = useState<AnunciosFiltros>({
    search: "",
    fechaDesde: null,
    fechaHasta: null,
    categoria: "",
    encuestaActiva: false,
  });

  const invalidar = () =>
    void queryClient.invalidateQueries({ queryKey: anunciosQueryKey });
  /*
    El respaldo es por mutacion. Antes era uno solo --«No se pudo guardar el
    anuncio»-- compartido por publicar, borrar y votar, asi que al votar dos
    veces la misma opcion el aviso hablaba de un anuncio.
  */
  const alFallar = (respaldo: string) => (error: unknown) =>
    addToast(mensajeDeError(error, respaldo), "error");

  const mutation = useMutation({
    mutationFn: (datos: Omit<NuevoAnuncio, "condominioId">) =>
      crearAnuncio({ ...datos, condominioId }),
    onSuccess: invalidar,
    onError: alFallar("No se pudo publicar el anuncio"),
  });

  const emitirVoto = useMutation({
    mutationFn: ({
      publicacionUuid,
      opcionUuid,
    }: {
      publicacionUuid: string;
      opcionUuid: string;
    }) => votar(publicacionUuid, opcionUuid, unidadesPropias[0]?.unidadId),
    onSuccess: invalidar,
    onError: alFallar("No se pudo registrar tu voto"),
  });

  const borrar = useMutation({
    mutationFn: (uuid: string) => eliminarAnuncio(uuid),
    onSuccess: invalidar,
    onError: alFallar("No se pudo eliminar el anuncio"),
  });

  const anuncios = useMemo(
    () =>
      (query.data ?? []).filter((anuncio: Anuncio) => {
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
    votar: (publicacionUuid: string, opcionUuid: string) =>
      emitirVoto.mutate({ publicacionUuid, opcionUuid }),
    votando: emitirVoto.isPending,
    eliminarAnuncio: (uuid: string) => borrar.mutate(uuid),
  };
}

/**
 * Detalle de un anuncio.
 *
 * El detalle nominal y los pendientes se consultan aparte porque la base decide
 * si corresponde devolverlos: si la votacion es secreta o quien mira no
 * administra, vienen vacios y la pantalla no muestra nombres.
 */
export function useAnuncioDetalle(uuid: string) {
  const anuncios = useQuery({
    queryKey: anunciosQueryKey,
    queryFn: obtenerAnuncios,
  });

  const nominal = useQuery({
    queryKey: [...anunciosQueryKey, uuid, "detalle"],
    queryFn: () => detalleVotacion(uuid),
    enabled: Boolean(uuid),
  });

  const pendientes = useQuery({
    queryKey: [...anunciosQueryKey, uuid, "pendientes"],
    queryFn: () => pendientesVotacion(uuid),
    enabled: Boolean(uuid),
  });

  const votosPropios = useQuery({
    queryKey: [...anunciosQueryKey, uuid, "mi-voto"],
    queryFn: () => miVoto(uuid),
    enabled: Boolean(uuid),
  });

  return {
    data: (anuncios.data ?? []).find((item: Anuncio) => item.uuid === uuid),
    isLoading: anuncios.isLoading,
    detalleNominal: nominal.data ?? [],
    /*
      La unidad **y** el propietario. Se quedaba solo con la unidad, asi que
      «No votaron» era una lista de numeros y la administracion no sabia a
      quien llamar --que es justo para lo que se mira--. Lo pidio el cliente el
      02/10/2026: el depto junto al nombre, no en su lugar.
    */
    pendientes: (pendientes.data ?? []).map((p) =>
      nombreDeVecino(p.propietario, p.unidad),
    ),
    yaVote: (votosPropios.data ?? []).length > 0,
    misOpciones: votosPropios.data ?? [],
  };
}
