import { useMemo } from 'react';
import { useAdminStore, useAuthStore, usePerfilStore } from '@/stores';
import { obtenerNombreUsuario, obtenerTurnoActual } from '../helpers/perfil.helpers';
import type { GuardiaPerfil } from '../types/perfil';

export function usePerfil() {
  const { usuario, rolActivo, modo } = useAuthStore();
  const guardias = useAdminStore((state) => state.guardias);
  const { alias, usaAliasCuadroHonor, usaAliasZonas, actualizarAlias } = usePerfilStore();

  const guardiaActual = useMemo<GuardiaPerfil | null>(() => {
    if (rolActivo !== 'guardia') return null;
    return (guardias.find((guardia) => guardia.nombre === (usuario?.nombre || 'Roberto Hornado')) as GuardiaPerfil | undefined) || null;
  }, [guardias, rolActivo, usuario?.nombre]);

  return {
    usuario,
    rolActivo,
    modo,
    nombre: obtenerNombreUsuario(usuario, rolActivo, modo),
    esGuardia: rolActivo === 'guardia',
    guardiaActual,
    turnoActual: obtenerTurnoActual(guardiaActual),
    alias,
    usaAliasCuadroHonor,
    usaAliasZonas,
    actualizarAlias,
  };
}

