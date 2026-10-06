import { z } from "zod";

/**
 * El alta y la edición de un coadministrador.
 *
 * Los mensajes son **nuestros y en castellano**. Sin ellos zod pone los suyos
 * —«Invalid email», «String must contain at least 1 character(s)»— y eso es lo
 * que habría leído la administración el día que se enseñaran los errores: un
 * texto en inglés que no dice qué hacer.
 *
 * Un esquema sin mensajes no se nota mientras el formulario no los pinte, que
 * es como estuvo este: validaba, rechazaba, y no decía nada.
 */
export const coadministradorSchema = z.object({
  nombre: z.string().trim().min(1, "Escribe el nombre"),
  apellido: z.string(),
  correo: z
    .string()
    .trim()
    .min(1, "Escribe el correo")
    .email("Ese correo no parece válido"),
  celular: z.string(),
  codigoPais: z.string(),
  permisos: z.record(z.boolean()),
});
