
import { residentesDeLaLista } from "../services/residentesActuales";import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/auth-store";
import { useUIStore } from "@/stores/ui-store";
import { useUnidadActiva } from "@/shared/hooks";
import {
  cambiarVisibilidad,
  declararseResidente,
  designarPrimario,
  obtenerResidentes,
  quitarDeLaVivienda,
  type ResidenteDeUnidad,
} from "../services/residentes.repo";

/**
 * Quién vive en la vivienda que se está configurando.
 *
 * Salía de `propietario-store`, un store de Zustand con **tres personas
 * inventadas** escritas a mano —"Alberto Manual", con la errata, y dos más con
 * cédulas ficticias— y con toda la lógica de anfitrión primario,
 * administrador primario y declaración de residencia resuelta en memoria. Se
 * perdía al recargar, y `es_residente` decide de verdad qué anuncios y qué
 * grupos de chat le llegan a cada quien.
 *
 * El bloque de arriba de la pantalla es **uno mismo**; la lista de abajo, los
 * demás. Antes no hacía falta distinguirlos porque el propietario no estaba en
 * la lista: no estaba en ningún sitio.
 */
export const RESIDENTES_UNIDAD_KEY = ["propietario", "residentes-unidad"];

export function usePropietarioConfiguracion() {
  const queryClient = useQueryClient();
  const usuarioId = useAuthStore((s) => s.usuarioId ?? "");
  const rolActivo = useAuthStore((s) => s.rolActivo);
  const addToast = useUIStore((s) => s.addToast);
  const unidad = useUnidadActiva();
  const unidadId = unidad?.unidadId ?? "";

  const query = useQuery({
    queryKey: [...RESIDENTES_UNIDAD_KEY, unidadId],
    queryFn: () => obtenerResidentes(unidadId),
    enabled: Boolean(unidadId),
  });

  const todos = query.data ?? [];
  const yo = todos.find((r) => r.usuarioId === usuarioId) ?? null;

  // La regla vive en `residentesDeLaLista`, con su prueba.
  const residentes = residentesDeLaLista(todos, usuarioId, rolActivo);

  const refrescar = () =>
    queryClient.invalidateQueries({ queryKey: RESIDENTES_UNIDAD_KEY });

  const avisar = (error: unknown, respaldo: string) =>
    addToast(error instanceof Error ? error.message : respaldo, "error");

  const designar = useMutation({
    mutationFn: ({
      membresiaId,
      cual,
    }: {
      membresiaId: string;
      cual: "anfitrion" | "administrador";
    }) => designarPrimario(membresiaId, cual),
    onSuccess: refrescar,
    onError: (error) => avisar(error, "No se pudo designar"),
  });

  const declarar = useMutation({
    mutationFn: (valor: boolean) => declararseResidente(unidadId, valor),
    onSuccess: refrescar,
    onError: (error) => avisar(error, "No se pudo guardar la declaración"),
  });

  const visibilidad = useMutation({
    mutationFn: ({
      membresiaId,
      cambios,
    }: {
      membresiaId: string;
      cambios: Parameters<typeof cambiarVisibilidad>[1];
    }) => cambiarVisibilidad(membresiaId, cambios),
    onSuccess: refrescar,
    onError: (error) => avisar(error, "No se pudo cambiar la visibilidad"),
  });

  const quitar = useMutation({
    mutationFn: (membresiaId: string) => quitarDeLaVivienda(membresiaId),
    onSuccess: () => {
      refrescar();
      addToast("Se dio de baja de la vivienda", "success");
    },
    onError: (error) =>
      avisar(error, "No se pudo dar de baja a esa persona"),
  });

  return {
    cargando: query.isLoading,
    /** Los demás; uno mismo va aparte, en el bloque de arriba. */
    residentes,
    /** La propia membresía en esta vivienda, si la hay. */
    yo,
    propietarioAnfitrionPrimario: yo?.esAnfitrionPrimario ?? false,
    propietarioAdministradorPrimario: yo?.esAdministradorPrimario ?? false,
    /**
     * Si uno se declara residente de esta vivienda. Era un mapa
     * `correo -> boolean` en memoria, lo que además usaba el correo como clave
     * de identidad, que la regla 3 prohíbe.
     */
    esResidente: yo?.esResidente ?? false,

    setAnfitrionPrimario: (membresiaId: string) =>
      designar.mutate({ membresiaId, cual: "anfitrion" }),
    setAdministradorPrimario: (membresiaId: string) =>
      designar.mutate({ membresiaId, cual: "administrador" }),
    /** Sobre uno mismo: nadie dice dónde vive su vecino. */
    togglePropietarioResidente: (valor: boolean) => declarar.mutate(valor),
    cambiarVisibilidad: (
      membresiaId: string,
      cambios: Parameters<typeof cambiarVisibilidad>[1],
    ) => visibilidad.mutate({ membresiaId, cambios }),
    eliminarResidente: (membresiaId: string) => quitar.mutate(membresiaId),
    guardando:
      designar.isPending ||
      declarar.isPending ||
      visibilidad.isPending ||
      quitar.isPending,
  };
}

export type { ResidenteDeUnidad };
