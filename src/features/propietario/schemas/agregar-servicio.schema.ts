import { z } from "zod";

/**
 * Un día del mes, o nada.
 *
 * Se admite 31 aunque febrero no lo tenga: quien escribe 31 quiere decir «el
 * último», y rechazárselo sería peor que guardarlo. La base comprueba lo mismo.
 */
const diaDelMes = z
  .string()
  .optional()
  .refine(
    (v) => {
      if (!v || !v.trim()) return true;
      const n = Number(v.trim());
      return Number.isInteger(n) && n >= 1 && n <= 31;
    },
    { message: "Es un día del mes, del 1 al 31" },
  );

/**
 * El alta de un servicio contratado de la vivienda: luz, agua, internet.
 *
 * `primerAviso` y `segundoAviso` son **el día del mes en que vence**, no una
 * fecha: un servicio se repite todos los meses y una fecha concreta caduca en
 * cuanto pasa. Lo decidió el cliente el 06/10/2026.
 *
 * Viajan como texto porque el campo es un `Input`, y se convierten a número en
 * el hook, que es la frontera con la base —la columna es `smallint`—.
 */
export const agregarServicioSchema = z.object({
  nombreServicio: z.string().min(1, "Nombre del servicio requerido"),
  nombreEmpresa: z.string().optional(),
  numeroCliente: z.string().optional(),
  numeroMedidor: z.string().optional(),
  primerAviso: diaDelMes,
  segundoAviso: diaDelMes,
  correoFactura: z
    .string()
    .email("Correo inválido")
    .optional()
    .or(z.literal("")),
  /** ISO 3166-1 alfa-2 del teléfono de atención de la empresa. */
  codigoPais: z.string().optional(),
  numeroTelefono: z.string().optional(),
});

export type AgregarServicioFormData = z.infer<typeof agregarServicioSchema>;
