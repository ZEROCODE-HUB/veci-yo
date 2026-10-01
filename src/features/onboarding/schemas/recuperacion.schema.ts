import { z } from "zod";

export const recuperacionSchema = z.object({
  correo: z.string().email("Ingresa un correo válido"),
});

export type RecuperacionFormData = z.infer<typeof recuperacionSchema>;
