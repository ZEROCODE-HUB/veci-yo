import { z } from 'zod';

export const correspondenciaSchema = z.object({
  categoria: z.string().min(1, 'Selecciona una categoría'),
  logistica: z.string().optional(),
  nombre: z.string().optional(),
  ci: z.string().optional(),
  instrucciones: z.string().optional(),
  entregaEnPuerta: z.boolean(),
  estadoEncomienda: z.string().min(1, 'Selecciona un estado de encomienda'),
  descripcion: z.string().optional(),
  torre: z.string().optional(),
  piso: z.string().optional(),
  // Los `unidadId`, no los codigos: un «101» puede existir en dos torres.
  unidades: z.array(z.string()).min(1, 'Selecciona al menos un departamento'),
});

export type CorrespondenciaFormData = z.infer<typeof correspondenciaSchema>;
