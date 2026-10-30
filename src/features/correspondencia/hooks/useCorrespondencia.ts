import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FILTROS_ESTADO } from "../constants";
import type { CorrespondenciaItem } from "@/shared/types";
import { useAuthStore } from "@/stores";
import { useUIStore } from "@/stores/ui-store";
import { useUnidadElegidaDelRol } from "@/shared/hooks";
import { supabase } from "@/shared/services/supabase";
import {
  cambiarEstadoCorrespondencia,
  eliminarCorrespondencia,
  notificarPorOtroMedio,
  obtenerCorrespondencia,
  obtenerPermisosDeEntrega,
  registrarCorrespondencia,
  reportarIncidencia,
  type AmbitoCorrespondencia,
  type NuevaCorrespondencia,
} from "../services/correspondencia.repo";
import { mensajeDeError } from "@/shared/utils/error.util";
import type { ArchivoElegido } from "@/shared/services/archivos";
import {
  filtrarCorrespondencia,
  filtrosOcultosActivos,
  type CriteriosDeCorrespondencia,
} from "../helpers/lista";

export const correspondenciaQueryKey = ["correspondencia"] as const;

/**
 * Los datos viven en Supabase; React Query es la unica cache. Antes habia un
 * store de Zustand con los items y las mutaciones lo actualizaban a mano
 * ademas de invalidar la consulta, con dos copias del mismo dato.
 */
export function useCorrespondencia() {
  const queryClient = useQueryClient();
  const addToast = useUIStore((s) => s.addToast);

  /*
    El ambito lo decide **el rol con el que se entro**, no la identidad (regla
    8). Marcela administra el condominio y ademas es propietaria de la 301: al
    entrar como propietaria veia los paquetes de la 101 y de la 102. Es la
    misma correccion que ya llevan las visitas y las reservas.

    Las unidades son las **de las que es miembro**, que vienen en la sesion; no
    las de `useUnidadesDisponibles`, que son todas las del condominio y dejarian
    el filtro sin efecto --ese error ya se cometio una vez, en visitas--.
  */
  const rolActivo = useAuthStore((s) => s.rolActivo);
  const ambito: AmbitoCorrespondencia =
    rolActivo === "guardia" || rolActivo === "administrador"
      ? "condominio"
      : "unidad";
  // Y de esas, la elegida en el selector de arriba: una vivienda cada vez.
  const unidadIds = useUnidadElegidaDelRol();

  const query = useQuery({
    // El ambito y las unidades entran en la clave: al cambiar de rol sin salir
    // de la pantalla, la lista se vuelve a pedir en vez de servir la de antes.
    queryKey: [...correspondenciaQueryKey, ambito, ...unidadIds],
    queryFn: () => obtenerCorrespondencia({ ambito, unidadIds }),
  });

  const invalidar = () => {
    void queryClient.invalidateQueries({ queryKey: correspondenciaQueryKey });
  };

  /*
    Lo que cambia otro --la portería registra, entrega o borra-- llega solo.
    Antes el vecino seguía viendo un paquete borrado hasta salir y volver
    (Para Claude 123, 28/10/2026). Realtime respeta la política de lectura,
    así que solo avisa de lo que esta persona ya puede ver. El nombre lleva
    un sufijo propio: varias pantallas montan este hook a la vez.
  */
  useEffect(() => {
    const canal = supabase
      .channel(`correspondencia-${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "correspondencia" },
        () => {
          void queryClient.invalidateQueries({ queryKey: correspondenciaQueryKey });
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(canal);
    };
  }, [queryClient]);

  const alFallar = (error: unknown) =>
    addToast(
      mensajeDeError(error, "No se pudo guardar el cambio"),
      "error",
    );

  const crear = useMutation({
    mutationFn: (envios: NuevaCorrespondencia[]) =>
      registrarCorrespondencia(envios),
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

  const notificar = useMutation({
    mutationFn: (uuid: string) => notificarPorOtroMedio(uuid),
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
      condicion,
    }: {
      uuid: string;
      descripcion: string;
      fotos?: ArchivoElegido[];
      condicion?: string;
    }) => reportarIncidencia(uuid, descripcion, fotos, condicion),
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
    notificarPorOtroMedio: (uuid: string) => notificar.mutate(uuid),
    eliminar: (uuid: string, opciones?: { onSuccess?: () => void }) =>
      borrar.mutate(uuid, opciones),
    /*
      Con sus callbacks, como `agregar`: la pantalla anunciaba «Incidencia
      reportada» en cuanto se pulsaba, sin esperar a saber si se habia
      guardado.
    */
    reportarIncidencia: informar.mutate,
    informando: informar.isPending,
  };
}

/**
 * Que viviendas tienen autorizada la entrega en puerta, para decirlo antes de
 * guardar. Solo lo pide la pantalla de alta.
 */
export function usePermisosDeEntrega() {
  const query = useQuery({
    queryKey: ["correspondencia-permisos-de-entrega"],
    queryFn: obtenerPermisosDeEntrega,
  });
  return query.data ?? [];
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

  /*
    Las dos fechas se elegian y no entraban en el filtro: estaban en la lista
    de dependencias de nadie. La regla vive en `filtrarCorrespondencia`, con
    sus pruebas.
  */
  const criterios = useMemo<CriteriosDeCorrespondencia>(
    () => ({
      busqueda: search,
      estados: estadoSeleccionados,
      categoria: catFilter,
      soloEntregaEnPuerta: entregaFilter,
      fechaDesde,
      fechaHasta,
    }),
    [catFilter, entregaFilter, estadoSeleccionados, fechaDesde, fechaHasta, search],
  );
  const filtered = useMemo(
    () => filtrarCorrespondencia(items, criterios),
    [items, criterios],
  );

  const quitarFiltros = () => {
    setCatFilter("");
    setEntregaFilter(false);
    setFechaDesde("");
    setFechaHasta("");
  };

  return {
    filtered,
    ocultosActivos: filtrosOcultosActivos(criterios),
    quitarFiltros,
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
