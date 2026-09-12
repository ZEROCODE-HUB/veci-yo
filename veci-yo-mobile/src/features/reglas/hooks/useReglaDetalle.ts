import { useState } from 'react';
import { useAuthStore } from '@/stores';
import { reglasContenido } from '../helpers/reglasContenido';
import type { TipoRegla } from '../types/reglas';

export function useReglaDetalle(tipo?: string) {
  const role = useAuthStore((state) => state.rolActivo);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [downloadOpen, setDownloadOpen] = useState(false);
  const content = reglasContenido[(tipo as TipoRegla) || 'residente-permanente'];
  return { role, content, uploadOpen, setUploadOpen, downloadOpen, setDownloadOpen, isTemporaryGuest: role === 'huesped-temporal' };
}

