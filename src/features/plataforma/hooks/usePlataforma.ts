import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/auth-store";
import {
  buscarCuenta,
  crearEdificio,
  darRolDePlataforma,
  obtenerBitacora,
  obtenerEdificios,
  obtenerReclamosDeLaApp,
  obtenerResumen,
  obtenerStaff,
  quitarRolDePlataforma,
  responderReclamo,
  type EdificioNuevo,
} from "../services/plataforma.repo";
import type { Database } from "@/shared/types/database.types";

type RolPlataforma = Database["public"]["Enums"]["rol_plataforma"];
type EstadoReclamo = Database["public"]["Enums"]["estado_reclamo"];

export const PLATAFORMA_QUERY_KEY = ["plataforma"];

/**
 * Lo que el panel de la plataforma necesita.
 *
 * Las consultas van con `enabled` contra `rolPlataforma`: si alguien llega aquí
 * sin el rol --por una navegación que no debería existir-- no se mandan unas
 * peticiones que la base va a rechazar y que llenarían la pantalla de errores
 * en vez de dejarla vacía.
 */
export function usePlataforma() {
  const queryClient = useQueryClient();
  const rolPlataforma = useAuthStore((s) => s.rolPlataforma);
  const esDueno = rolPlataforma === "dueno";
  const puede = Boolean(rolPlataforma);

  const refrescar = () =>
    queryClient.invalidateQueries({ queryKey: PLATAFORMA_QUERY_KEY });

  const resumen = useQuery({
    queryKey: [...PLATAFORMA_QUERY_KEY, "resumen"],
    queryFn: obtenerResumen,
    enabled: puede,
  });

  const edificios = useQuery({
    queryKey: [...PLATAFORMA_QUERY_KEY, "edificios"],
    queryFn: obtenerEdificios,
    enabled: puede,
  });

  const crear = useMutation({
    mutationFn: (datos: EdificioNuevo) => crearEdificio(datos),
    onSuccess: refrescar,
  });

  return {
    rolPlataforma,
    esDueno,
    resumen: resumen.data ?? null,
    edificios: edificios.data ?? [],
    cargando: resumen.isLoading || edificios.isLoading,
    error: resumen.error ?? edificios.error ?? null,
    refrescar,
    crear,
  };
}

/** Las PQRS sobre la aplicación, y su respuesta. */
export function useSoportePlataforma() {
  const queryClient = useQueryClient();
  const rolPlataforma = useAuthStore((s) => s.rolPlataforma);

  const query = useQuery({
    queryKey: [...PLATAFORMA_QUERY_KEY, "soporte"],
    queryFn: obtenerReclamosDeLaApp,
    enabled: Boolean(rolPlataforma),
  });

  const responder = useMutation({
    mutationFn: (params: {
      reclamoId: string;
      resolucion: string;
      estado: EstadoReclamo;
    }) => responderReclamo(params),
    onSuccess: () => {
      /*
        Se invalida todo el panel y no solo la lista: el contador de «PQRS sin
        atender» de la portada sale de otra consulta, y si no se refresca sigue
        diciendo el número de antes.
      */
      void queryClient.invalidateQueries({ queryKey: PLATAFORMA_QUERY_KEY });
    },
  });

  return {
    reclamos: query.data ?? [],
    cargando: query.isLoading,
    error: query.error,
    responder,
  };
}

/** El equipo de la plataforma. Repartir el rol es solo del dueño. */
export function useStaffPlataforma() {
  const queryClient = useQueryClient();
  const rolPlataforma = useAuthStore((s) => s.rolPlataforma);
  const usuarioId = useAuthStore((s) => s.usuarioId);

  const query = useQuery({
    queryKey: [...PLATAFORMA_QUERY_KEY, "staff"],
    queryFn: obtenerStaff,
    enabled: Boolean(rolPlataforma),
  });

  const refrescar = () =>
    queryClient.invalidateQueries({
      queryKey: [...PLATAFORMA_QUERY_KEY, "staff"],
    });

  const buscar = useMutation({ mutationFn: (correo: string) => buscarCuenta(correo) });

  const dar = useMutation({
    mutationFn: (params: {
      usuarioId: string;
      rol: RolPlataforma;
      nota?: string;
    }) => darRolDePlataforma(params),
    onSuccess: refrescar,
  });

  const quitar = useMutation({
    mutationFn: (id: string) => quitarRolDePlataforma(id),
    onSuccess: refrescar,
  });

  return {
    staff: query.data ?? [],
    cargando: query.isLoading,
    error: query.error,
    /** Para no ofrecer «quitar» sobre la propia fila: la base lo rechaza. */
    usuarioId,
    esDueno: rolPlataforma === "dueno",
    buscar,
    dar,
    quitar,
  };
}

export function useBitacoraPlataforma() {
  const rolPlataforma = useAuthStore((s) => s.rolPlataforma);

  const query = useQuery({
    queryKey: [...PLATAFORMA_QUERY_KEY, "bitacora"],
    queryFn: () => obtenerBitacora(100),
    enabled: Boolean(rolPlataforma),
  });

  return {
    lineas: query.data ?? [],
    cargando: query.isLoading,
    error: query.error,
  };
}
