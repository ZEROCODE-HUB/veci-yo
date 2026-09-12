import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { usePerfilStore } from '@/stores/perfil-store';
import {
  actualizarEstadoReclamo,
  actualizarEstadoReclamoConMensaje,
  crearReclamo,
  obtenerReclamos,
} from '../services/perfil.service';
import type { Reclamo } from '@/stores/perfil-store';

export const RECLAMOS_QUERY_KEY = ['perfil', 'reclamos'];

export function useReclamos() {
  const queryClient = useQueryClient();
  const reclamosLocales = usePerfilStore((state) => state.reclamos);
  const query = useQuery({ queryKey: RECLAMOS_QUERY_KEY, queryFn: obtenerReclamos });

  const crear = useMutation({
    mutationFn: (datos: Omit<Reclamo, 'id' | 'numero' | 'nombre' | 'ci' | 'estado' | 'fechaCreacion' | 'fechaRevision'>) => crearReclamo(datos),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: RECLAMOS_QUERY_KEY }),
  });

  const cambiarEstado = useMutation({
    mutationFn: ({ id, estado }: { id: number; estado: string }) => actualizarEstadoReclamo(id, estado),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: RECLAMOS_QUERY_KEY }),
  });

  const resolver = useMutation({
    mutationFn: ({ id, estado, mensaje }: { id: number; estado: string; mensaje: string }) => actualizarEstadoReclamoConMensaje(id, estado, mensaje),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: RECLAMOS_QUERY_KEY }),
  });

  return {
    ...query,
    reclamos: query.data ?? reclamosLocales,
    crear,
    cambiarEstado,
    resolver,
  };
}

