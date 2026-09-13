import { visitaSchema } from "../schemas/visita.schema";

export function useVisitaNuevo() {
  const validar = (datos: unknown) => visitaSchema.safeParse(datos);
  return { validar };
}
