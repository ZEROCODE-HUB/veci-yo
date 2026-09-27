import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useUIStore } from "@/stores/ui-store";
import { useAuthStore } from "@/stores";
import {
  actualizarParticipante,
  actualizarReserva,
  actualizarZona,
  crearReserva,
  crearZona,
  cancelarReserva,
  eliminarZona,
  obtenerReservas,
  type AmbitoReservas,
  obtenerZonas,
  resolverReserva,
  type DatosZona,
  type NuevaReserva,
} from "../services/zonas.repo";

export const ZONAS_QUERY_KEY = ["zonas"];
export const RESERVAS_QUERY_KEY = ["reservas-zona"];
/**
 * Lo que `ocupacion_zona()` dice que esta tomado en cada franja.
 *
 * Es una tercera consulta, con su propia clave, y no se invalidaba: al
 * reservar aparecia la tarjeta de la reserva --esa sale de
 * `RESERVAS_QUERY_KEY`-- pero el contador de al lado seguia diciendo «quedan 4
 * de 4» hasta recargar la pagina. Dos numeros de la misma franja
 * contradiciendose en pantalla.
 *
 * Se invalida por prefijo: la clave lleva zona y dia, y despues de escribir no
 * hay motivo para conservar ninguno.
 */
export const OCUPACION_QUERY_KEY = ["ocupacion-zona"];

/**
 * Única fuente de verdad de zonas comunes y reservas.
 *
 * El prototipo mantenía tres mapas en un store de Zustand
 * (`zonasComunesConfig`, `gestionZonas`, `reservas`) que en la base son dos
 * tablas. Se conservan las tres formas para no reescribir todas las pantallas,
 * pero salen de la misma consulta.
 */
export function useZonas() {
  const client = useQueryClient();
  const addToast = useUIStore((s) => s.addToast);

  const zonas = useQuery({ queryKey: ZONAS_QUERY_KEY, queryFn: obtenerZonas });
  /*
    El ambito lo decide el rol con el que se entro, igual que en las visitas.

    La lista de Marcela --que administra el condominio y es propietaria de la
    301-- traia once reservas de la 102 y la 205 y ninguna suya. Las unidades
    salen de la sesion, que son las de las que **es miembro**; las de
    `useUnidadesDisponibles` son todas las del edificio y no sirven para esto.
  */
  const rolActivo = useAuthStore((s) => s.rolActivo);
  const unidadesPropias = useAuthStore((s) => s.unidades);
  const ambito: AmbitoReservas =
    rolActivo === "guardia" || rolActivo === "administrador"
      ? "condominio"
      : "unidad";
  const unidadIds = unidadesPropias.map((u) => u.unidadId);

  const reservas = useQuery({
    queryKey: [...RESERVAS_QUERY_KEY, ambito, ...unidadIds],
    queryFn: () => obtenerReservas({ ambito, unidadIds }),
  });

  const invalidar = () => {
    void client.invalidateQueries({ queryKey: ZONAS_QUERY_KEY });
    void client.invalidateQueries({ queryKey: RESERVAS_QUERY_KEY });
    void client.invalidateQueries({ queryKey: OCUPACION_QUERY_KEY });
  };

  const alFallar = (error: unknown) =>
    addToast(
      error instanceof Error ? error.message : "No se pudo guardar el cambio",
      "error",
    );

  const nuevaZona = useMutation({
    mutationFn: (datos: DatosZona) => crearZona(datos),
    onSuccess: invalidar,
    onError: alFallar,
  });

  const editarZona = useMutation({
    mutationFn: ({ zonaId, datos }: { zonaId: string; datos: Partial<DatosZona> }) =>
      actualizarZona(zonaId, datos),
    onSuccess: invalidar,
    onError: alFallar,
  });

  const borrarZona = useMutation({
    mutationFn: (zonaId: string) => eliminarZona(zonaId),
    onSuccess: invalidar,
    onError: alFallar,
  });

  const nuevaReserva = useMutation({
    mutationFn: (datos: NuevaReserva) => crearReserva(datos),
    onSuccess: invalidar,
    onError: alFallar,
  });

  const resolver = useMutation({
    mutationFn: ({
      reservaUuid,
      estado,
      motivoRechazo,
    }: {
      reservaUuid: string;
      estado: string;
      motivoRechazo?: string;
    }) => resolverReserva(reservaUuid, estado, motivoRechazo),
    onSuccess: invalidar,
    onError: alFallar,
  });

  const editarReserva = useMutation({
    mutationFn: ({
      reservaUuid,
      datos,
    }: {
      reservaUuid: string;
      datos: Parameters<typeof actualizarReserva>[1];
    }) => actualizarReserva(reservaUuid, datos),
    onSuccess: invalidar,
    onError: alFallar,
  });

  const borrarReserva = useMutation({
    /*
      Cancelar, no borrar. El `delete` no funcionaba para un huesped --no tiene
      politica de borrado-- y PostgREST respondia que si: el boton decia
      "listo" y la reserva seguia ocupando la franja.
    */
    mutationFn: (reservaUuid: string) => cancelarReserva(reservaUuid),
    onSuccess: invalidar,
    onError: alFallar,
  });

  const editarParticipante = useMutation({
    mutationFn: ({
      participanteUuid,
      datos,
    }: {
      participanteUuid: string;
      datos: Parameters<typeof actualizarParticipante>[1];
    }) => actualizarParticipante(participanteUuid, datos),
    onSuccess: invalidar,
    onError: alFallar,
  });

  return {
    zonasComunesConfig: zonas.data?.config ?? {},
    gestionZonas: zonas.data?.gestion ?? {},
    reservas: reservas.data ?? [],
    cargando: zonas.isLoading || reservas.isLoading,

    agregarZonaComun: nuevaZona.mutate,
    agregarGestionZona: nuevaZona.mutate,
    actualizarZonaComun: (zonaId: string, datos: Partial<DatosZona>) =>
      editarZona.mutate({ zonaId, datos }),
    actualizarGestionZona: (zonaId: string, datos: Partial<DatosZona>) =>
      editarZona.mutate({ zonaId, datos }),
    eliminarZonaComun: (zonaId: string) => borrarZona.mutate(zonaId),
    eliminarGestionZona: (zonaId: string) => borrarZona.mutate(zonaId),

    agregarReserva: nuevaReserva.mutate,
    creandoReserva: nuevaReserva.isPending,
    actualizarEstadoReserva: (
      reservaUuid: string,
      estado: string,
      motivoRechazo?: string,
    ) => resolver.mutate({ reservaUuid, estado, motivoRechazo }),
    actualizarReserva: (
      reservaUuid: string,
      datos: Parameters<typeof actualizarReserva>[1],
    ) => editarReserva.mutate({ reservaUuid, datos }),
    eliminarReserva: (reservaUuid: string) => borrarReserva.mutate(reservaUuid),
    actualizarPersonaReserva: (
      participanteUuid: string,
      datos: Parameters<typeof actualizarParticipante>[1],
    ) => editarParticipante.mutate({ participanteUuid, datos }),
  };
}
