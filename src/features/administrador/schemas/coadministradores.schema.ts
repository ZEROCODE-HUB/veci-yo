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
const correoDeAlta = z
  .string()
  .trim()
  .min(1, "Escribe el correo")
  .email("Ese correo no parece válido");

/**
 * Según sea un alta o una edición.
 *
 * El correo solo se pide **al invitar**. A quien ya aceptó no se le ve --la
 * identidad es su cuenta, no un dato de la membresía-- así que el campo
 * llegaba vacío y «Guardar cambios» exigía escribir uno, que luego se tiraba
 * (13/10/2026).
 */
export function coadministradorSchemaPara(esAlta: boolean) {
  return z.object({
    nombre: z.string().trim().min(1, "Escribe el nombre"),
    apellido: z.string(),
    correo: esAlta ? correoDeAlta : z.string(),
    celular: z
      .string()
      .refine(
        (v) => v === "" || /^\d{7,15}$/.test(v.replace(/\D/g, "")),
        "Revisa el celular: entre 7 y 15 cifras",
      ),
    codigoPais: z.string(),
    permisos: z.record(z.boolean()),
  });
}
