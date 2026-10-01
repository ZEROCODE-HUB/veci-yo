import { z } from "zod";
export const reporteRangeSchema = z.object({
  todoHistorial: z.boolean(),
  desde: z.date().nullable(),
  hasta: z.date().nullable(),
});
