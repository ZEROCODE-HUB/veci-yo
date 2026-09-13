import { z } from "zod";

export const ubicacionSchema = z.object({
  distrito: z.string(),
  urbanizacion: z.string(),
  condominio: z.string(),
  correoAdm: z.string(),
  imagen: z.string().nullable(),
});

export type UbicacionFormValues = z.infer<typeof ubicacionSchema>;

