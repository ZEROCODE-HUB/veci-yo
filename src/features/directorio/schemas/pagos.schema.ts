import { z } from "zod";
export const pagosMasivosSchema = z.object({ manualCodes: z.string() });
export type PagosMasivosFormData = z.infer<typeof pagosMasivosSchema>;
