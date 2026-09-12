import { z } from "zod";
export const reservaZonaEditSchema = z.object({
  nombre: z.string(),
  depto: z.string(),
  fecha: z.string(),
  horario: z.string(),
  comentarios: z.string(),
});
