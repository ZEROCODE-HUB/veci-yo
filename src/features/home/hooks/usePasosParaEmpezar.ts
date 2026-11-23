import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/stores";
import { useCondominioActivo, useUnidadActiva } from "@/shared/hooks";
import { estadoDe, juntarCargas, type EstadoDeLaCarga } from "@/shared/components";
import {
  obtenerArquitectura,
  obtenerGuardias,
} from "@/features/administrador/services/arquitectura.repo";
import { ZONAS_QUERY_KEY } from "@/features/zonas/hooks/useZonas";
import { obtenerZonas } from "@/features/zonas/services/zonas.repo";
import { useAvisosEnEsteCelular } from "@/features/perfil/hooks/useAvisosEnEsteCelular";
import { usePerfil } from "@/features/perfil/hooks/usePerfil";
import { RESIDENTES_UNIDAD_KEY } from "@/features/propietario/hooks/usePropietarioConfiguracion";
import { useVehiculosResidente } from "@/features/propietario/hooks/useVehiculosResidente";
import {
  obtenerResidentes,
  viviendaEnAlquiler,
} from "@/features/propietario/services/residentes.repo";
import { contarReglamentosVigentes } from "../services/home.repo";
import {
  pasosDelAdministrador,
  pasosDelGuardia,
  pasosDelPropietario,
  type AvisosDelCelular,
  type PasoParaEmpezar,
} from "../helpers/pasosParaEmpezar";

/**
 * Las consultas de «Tu edificio, paso a paso» (16/11/2026), una por rol.
 *
 * Cada una pide **con la misma clave** que la pantalla donde se hace el paso:
 * TanStack Query las comparte, así que no se pide nada dos veces y, al volver
 * de dar de alta una torre, la lista ya sabe que está hecha.
 *
 * Mientras algo no ha llegado, `carga.cargando`: la tarjeta pinta bloques
 * grises y no un «pendiente» que todavía no se sabe (13/11/2026).
 */
export interface PasosConCarga {
  pasos: PasoParaEmpezar[];
  carga: EstadoDeLaCarga;
}

function useAvisos(): AvisosDelCelular {
  const { estado, activar } = useAvisosEnEsteCelular();
  return { disponible: estado.disponible, permiso: estado.permiso, activar };
}

export function usePasosDelAdministrador(): PasosConCarga {
  const condominioId = useCondominioActivo() ?? "";
  const habilitado = Boolean(condominioId);

  // Las mismas tres que `useDatosCondominio` y `useZonas`.
  const arquitectura = useQuery({
    queryKey: ["condominio", "arquitectura", condominioId],
    queryFn: () => obtenerArquitectura(condominioId),
    enabled: habilitado,
  });
  const guardias = useQuery({
    queryKey: ["condominio", "guardias", condominioId],
    queryFn: () => obtenerGuardias(condominioId),
    enabled: habilitado,
  });
  const zonas = useQuery({
    queryKey: [...ZONAS_QUERY_KEY, condominioId],
    queryFn: () => obtenerZonas(condominioId),
  });
  const reglamentos = useQuery({
    queryKey: ["home", "reglamentos-vigentes", condominioId],
    queryFn: () => contarReglamentosVigentes(condominioId),
    enabled: habilitado,
  });

  const a = arquitectura.data;
  const pasos = pasosDelAdministrador({
    torres: a?.torres.length ?? 0,
    viviendas: a?.unidades.length ?? 0,
    viviendasConPropietario: (a?.unidades ?? []).filter((u) => u.estado !== "disponible").length,
    estacionamientos: a?.estacionamientos.length ?? 0,
    garitas: a?.porterias.length ?? 0,
    guardias: guardias.data?.length ?? 0,
    zonas: Object.keys(zonas.data?.gestion ?? {}).length,
    reglamentos: reglamentos.data ?? 0,
  });

  return {
    pasos,
    carga: juntarCargas(
      // Sin edificio todavía, la consulta está apagada y no «carga»: se espera igual.
      { ...estadoDe(arquitectura), cargando: estadoDe(arquitectura).cargando || !habilitado },
      estadoDe(guardias),
      estadoDe(zonas),
      estadoDe(reglamentos),
    ),
  };
}

export function usePasosDelPropietario(): PasosConCarga {
  const usuarioId = useAuthStore((s) => s.usuarioId ?? "");
  const unidadActiva = useUnidadActiva();
  const unidadId = unidadActiva?.unidadId ?? "";
  const tieneVivienda = Boolean(unidadId);
  // El propietario y el inquilino líder gestionan la vivienda (18/11/2026).
  const gestiona = unidadActiva?.rol === "propietario" || unidadActiva?.rol === "inquilino_lider";

  // La misma clave que la configuración del propietario.
  const residentes = useQuery({
    queryKey: [...RESIDENTES_UNIDAD_KEY, unidadId],
    queryFn: () => obtenerResidentes(unidadId),
    enabled: tieneVivienda,
  });
  const enAlquiler = useQuery({
    queryKey: ["propietario", "vivienda-en-alquiler", unidadId],
    queryFn: () => viviendaEnAlquiler(unidadId),
    enabled: tieneVivienda,
  });
  const vehiculos = useVehiculosResidente(unidadId);
  const avisos = useAvisos();

  const todos = residentes.data ?? [];
  const pasos = pasosDelPropietario({
    tieneVivienda,
    enAlquiler: enAlquiler.data ?? false,
    hayQuienViva: todos.some((r) => r.esResidente || r.usuarioId !== usuarioId),
    gestiona,
    tieneContacto: residentes.data
      ? Boolean(todos.find((r) => r.usuarioId === usuarioId)?.contactoNombre.trim())
      : undefined,
    cocheras: vehiculos.cocheras,
    vehiculos: vehiculos.vehiculos.length,
    avisos,
  });

  const cargas: EstadoDeLaCarga[] = [];
  if (tieneVivienda) cargas.push(estadoDe(residentes), estadoDe(enAlquiler), vehiculos.carga);
  return { pasos, carga: juntarCargas(...cargas) };
}

export function usePasosDelGuardia(): PasosConCarga {
  const { guardiaActual, cargaDelPuesto } = usePerfil();
  const avisos = useAvisos();

  const pasos = pasosDelGuardia({
    garita: guardiaActual?.garita ?? "",
    turnos: guardiaActual?.turnos?.length ?? 0,
    avisos,
  });

  return { pasos, carga: juntarCargas(cargaDelPuesto) };
}
