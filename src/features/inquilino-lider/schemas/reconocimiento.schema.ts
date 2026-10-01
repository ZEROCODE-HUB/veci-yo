import { z } from "zod";

export const reconocimientoSchema = z.object({
  destinatario: z.string().min(1),
  medalla: z.string().min(1),
});

export type ReconocimientoFormValues = z.infer<typeof reconocimientoSchema>;

