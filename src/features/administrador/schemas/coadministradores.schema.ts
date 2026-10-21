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
 *
 * El largo del celular lo pone la base (`telefono_largo_minimo` y
 * `telefono_largo_maximo`); quien arma el formulario lo pasa.
 */
export function coadministradorSchemaPara(
  esAlta: boolean,
  telefono: { min: number; max: number },
) {
  return z.object({
    nombre: z.string().trim().min(1, "Escribe el nombre"),
    apellido: z.string(),
    correo: esAlta ? correoDeAlta : z.string(),
    celular: z
      .string()
      .refine(
        (v) => {
          if (v === "") return true;
          const cifras = v.replace(/\D/g, "");
          return cifras.length >= telefono.min && cifras.length <= telefono.max;
        },
        `Revisa el celular: entre ${telefono.min} y ${telefono.max} cifras`,
      ),
    codigoPais: z.string(),
    permisos: z.record(z.boolean()),
  });
}
