import { useForm } from 'react-hook-form';
import { usePerfilStore } from '@/stores/perfil-store';
import { seguridadSchema, type SeguridadFormularioValores } from '../schemas/seguridad.schema';
import { zodResolver } from '@hookform/resolvers/zod';

export function useSeguridad() {
  const seguridad = usePerfilStore((state) => state.seguridad);
  const actualizarSeguridad = usePerfilStore((state) => state.actualizarSeguridad);
  const pausarCuenta = usePerfilStore((state) => state.pausarCuenta);
  const form = useForm<SeguridadFormularioValores>({
    resolver: zodResolver(seguridadSchema),
    defaultValues: seguridad,
  });

  return { ...form, seguridad, actualizarSeguridad, pausarCuenta };
}

