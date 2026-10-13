import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/stores";
import { useUIStore } from "@/stores/ui-store";
import { useCondominioActivo, useUnidadActiva } from "@/shared/hooks";
import { formatDateInput } from "@/shared/utils";
import { parseAnuncioDate } from "../helpers/anuncios.helpers";
import { nombreDeVecino } from "@/shared/services/nombreDeVecino";
import {
  crearAnuncio,
  detalleVotacion,
  eliminarAnuncio,
  misVotos,
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
  /*
    Las viviendas ya no se leen aqui: desde el 05/10/2026 el voto pertenece a
    **una** vivienda concreta --quien tiene dos vota dos veces-- asi que cual
    lo decide quien llama, que es la pantalla del detalle. Antes se mandaba
    `unidades[0]` y la segunda vivienda se quedaba sin voz.
  */
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
      unidadId,
    }: {
      publicacionUuid: string;
      opcionUuid: string;
      /** Por cuál de mis viviendas. Sin ninguna --portería, administración-- va vacío. */
      unidadId?: string;
    }) => votar(publicacionUuid, opcionUuid, unidadId),
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
        /*
          «Fecha desde» y «Fecha hasta» se guardaban en el filtro y aquí no
          se miraban: se elegían y la lista no cambiaba (13/10/2026). Se
          compara el día de publicación, en `yyyy-MM-dd`, que ordena como
          texto.
        */
        const dia = anuncio.fechaPublicada
          ? formatDateInput(parseAnuncioDate(anuncio.fechaPublicada))
          : "";
        const matchDesde =
          !filtros.fechaDesde ||
          (dia !== "" && dia >= formatDateInput(filtros.fechaDesde));
        const matchHasta =
          !filtros.fechaHasta ||
          (dia !== "" && dia <= formatDateInput(filtros.fechaHasta));
        return (
          matchSearch &&
          matchCategoria &&
          matchEncuesta &&
          matchAudiencia &&
          matchDesde &&
          matchHasta
        );
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
    eliminando: borrar.isPending,
    eliminarAnuncioAsync: borrar.mutateAsync,
    publicando: mutation.isPending,
    votar: (publicacionUuid: string, opcionUuid: string, unidadId?: string) =>
      emitirVoto.mutate({ publicacionUuid, opcionUuid, unidadId }),
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
  const unidadesDeLaSesion = useAuthStore((s) => s.unidades);
  const condominioId = useCondominioActivo() ?? "";
  const unidadActiva = useUnidadActiva();

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
    queryFn: () => misVotos(uuid),
    enabled: Boolean(uuid),
  });

  /*
    Se vota **por vivienda**: quien tiene dos vota dos veces, una por cada una.
    Lo decidio el cliente el 05/10/2026.

    Las viviendas salen de la sesion --`unidades`-- y no de
    `useUnidadesDisponibles`, que devuelve **todas las del condominio**: eso ya
    se equivoco una vez y dejo un filtro que no filtraba nada.
  */
  const anuncio = (anuncios.data ?? []).find((item: Anuncio) => item.uuid === uuid);
  const votos = votosPropios.data ?? [];
  const mias = unidadesDeLaSesion.filter((u) => u.condominioId === condominioId);
  const yaVotaron = new Set(votos.map((v) => v.unidadId).filter(Boolean));
  /*
    En una encuesta de **varias opciones** la vivienda no «termina» de votar
    al elegir la primera: puede seguir marcando. Se la sacaba de la lista
    igual, así que la segunda opción viajaba **sin vivienda** --un voto
    suelto, de persona, que cuenta aparte-- y la pantalla decía «puedes
    elegir más de una» (13/10/2026).

    Ahí vota la vivienda elegida arriba, y para votar por la otra se cambia
    de vivienda. En la de una sola opción sigue como estaba: las que faltan.
  */
  const esMultiple = Boolean(anuncio?.votacionMultiple);
  const laElegida =
    mias.find((u) => u.unidadId === unidadActiva?.unidadId) ?? mias[0];
  const pendientesMias = esMultiple
    ? laElegida
      ? [laElegida]
      : []
    : mias.filter((u) => !yaVotaron.has(u.unidadId));
  // Lo que ya marcó la vivienda que vota, no todo lo que marqué con todas.
  const votosALaVista =
    esMultiple && laElegida
      ? votos.filter((v) => v.unidadId === laElegida.unidadId)
      : votos;

  return {
    data: anuncio,
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
    yaVote: votosALaVista.length > 0,
    misOpciones: votosALaVista.map((v) => v.opcionUuid),
    /** Tiene vivienda aquí: su voto va siempre por una, nunca suelto. */
    votaPorVivienda: mias.length > 0,
    /**
     * Mis viviendas que todavia no han votado. Vacio si ya votaron todas, o si
     * no tengo ninguna --la porteria y la administracion votan como persona--.
     */
    viviendasPorVotar: pendientesMias.map((u) => ({
      unidadId: u.unidadId,
      codigo: u.codigo,
    })),
    /** Cuantas viviendas mias hay en este edificio. Con una, no se dice nada. */
    cuantasViviendas: mias.length,
  };
}
