import { z } from "zod";

export const seguridadSchema = z.object({
  correoRespaldo: z.string(),
  faceId: z.boolean(),
  huellaDactilar: z.boolean(),
  f2a: z.boolean(),
  pausarCuenta: z.boolean(),
});

export type SeguridadFormularioValores = z.infer<typeof seguridadSchema>;
