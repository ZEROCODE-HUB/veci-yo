import { z } from "zod";

export const zonaComunSchema = z.object({
  id: z.string(),
  nombre: z.string(),
  descripcion: z.string(),
  horariosDisponibles: z.string(),
  duracionPermitida: z.string().min(1),
  reglas: z.string(),
  capacidadMaxima: z.string().min(1),
  requiereAprobacion: z.boolean(),
  emoji: z.string(),
});
