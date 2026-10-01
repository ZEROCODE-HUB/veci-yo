import { z } from "zod";
export const permisosSchema = z.object({ entregaDirecta: z.boolean(), huespedesTemporales: z.boolean(), diferenciaEstancia: z.boolean().optional(), estanciaCorta: z.any(), estanciaLarga: z.any() });
