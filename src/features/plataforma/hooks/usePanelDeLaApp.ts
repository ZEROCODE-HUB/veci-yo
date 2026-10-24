import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/auth-store";
import {
  actuarSobreCuenta,
  cambiarParametro,
  cambiarPrecio,
  historialDeParametro,
  listarUsuarios,
  obtenerParametros,
  obtenerPrecios,
  obtenerTextosLegales,
  publicarTextoLegal,
  type AccionSobreCuenta,
} from "../services/plataforma.repo";
import { PLATAFORMA_QUERY_KEY } from "./usePlataforma";

/**
 * Lo que el administrador de la app cambia desde el panel (23/10/2026):
 * ajustes, precios, textos legales y cuentas.
 *
 * Mira cualquiera del equipo; escribe solo el dueño. `esDueno` sirve para no
 * ofrecer lo que la base va a rechazar, no para proteger nada.
 */
function useRolDelPanel() {
  const rolPlataforma = useAuthStore((s) => s.rolPlataforma);
  return { puede: Boolean(rolPlataforma), esDueno: rolPlataforma === "dueno" };
}

export function useAjustesDeLaApp() {
  const queryClient = useQueryClient();
  const { puede, esDueno } = useRolDelPanel();
  const clave = [...PLATAFORMA_QUERY_KEY, "ajustes"];

  const query = useQuery({ queryKey: clave, queryFn: obtenerParametros, enabled: puede });

  const cambiar = useMutation({
    mutationFn: (p: { clave: string; valor: string }) => cambiarParametro(p.clave, p.valor),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: clave });
      // Lo que la app ya leyó de los parámetros, también.
      void queryClient.invalidateQueries({ queryKey: ["parametros"] });
    },
  });

  return {
    parametros: query.data ?? [],
    cargando: query.isLoading,
    error: query.error,
    esDueno,
    cambiar,
  };
}

export function useHistorialDeAjuste(clave: string | null) {
  const { puede } = useRolDelPanel();
  const query = useQuery({
    queryKey: [...PLATAFORMA_QUERY_KEY, "ajustes", "historial", clave],
    queryFn: () => historialDeParametro(clave ?? ""),
    enabled: puede && Boolean(clave),
  });
  return { cambios: query.data ?? [], cargando: query.isLoading };
}

export function usePreciosDeLaApp() {
  const queryClient = useQueryClient();
  const { puede, esDueno } = useRolDelPanel();
  const clave = [...PLATAFORMA_QUERY_KEY, "precios"];

  const query = useQuery({ queryKey: clave, queryFn: obtenerPrecios, enabled: puede });
  const cambiar = useMutation({
    mutationFn: cambiarPrecio,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: clave });
      void queryClient.invalidateQueries({ queryKey: ["suscripcion"] });
    },
  });

  return { precios: query.data ?? [], cargando: query.isLoading, error: query.error, esDueno, cambiar };
}

export function useTextosLegalesDeLaApp() {
  const queryClient = useQueryClient();
  const { puede, esDueno } = useRolDelPanel();
  const clave = [...PLATAFORMA_QUERY_KEY, "textos-legales"];

  const query = useQuery({ queryKey: clave, queryFn: obtenerTextosLegales, enabled: puede });
  const publicar = useMutation({
    mutationFn: publicarTextoLegal,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: clave }),
  });

  return { textos: query.data ?? [], cargando: query.isLoading, error: query.error, esDueno, publicar };
}

/** La lista de cuentas: una página, filtrada por lo escrito (24/10/2026). */
export function useUsuariosDeLaApp(texto: string, pagina: number) {
  const queryClient = useQueryClient();
  const { puede, esDueno } = useRolDelPanel();
  const usuarioId = useAuthStore((s) => s.usuarioId);
  const clave = [...PLATAFORMA_QUERY_KEY, "cuentas"];

  const lista = useQuery({
    queryKey: [...clave, texto, pagina],
    queryFn: () => listarUsuarios(texto, pagina),
    enabled: puede,
    // Al pasar de página se queda la anterior a la vista hasta que llega la nueva.
    placeholderData: keepPreviousData,
  });

  const actuar = useMutation({
    mutationFn: (p: { usuarioId: string; accion: AccionSobreCuenta; motivo?: string }) =>
      actuarSobreCuenta(p.usuarioId, p.accion, p.motivo),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: clave }),
  });

  return {
    esDueno,
    usuarioId,
    cuentas: lista.data?.cuentas ?? [],
    total: lista.data?.total ?? 0,
    cargando: lista.isLoading,
    error: lista.error,
    actuar,
  };
}
