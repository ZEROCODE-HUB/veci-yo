import { z } from "zod";

export const chatNuevoSchema = z.object({
  torre: z.string().min(1),
  depto: z.string().optional(),
  piso: z.string().optional(),
  persona: z.string().optional(),
  busquedaPersona: z.string().optional(),
});

export type ChatNuevoFormData = z.infer<typeof chatNuevoSchema>;

