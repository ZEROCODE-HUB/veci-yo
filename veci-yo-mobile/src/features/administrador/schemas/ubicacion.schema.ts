import { z } from "zod";

export const ubicacionSchema = z.object({
  nombre: z.string(),
  direccion: z.string(),
  ciudad: z.string(),
  pais: z.string(),
  ruc: z.string(),
  telefono: z.string(),
  email: z.string(),
});
