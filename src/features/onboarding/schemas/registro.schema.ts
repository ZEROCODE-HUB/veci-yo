import { z } from "zod";

/**
 * Lo que hace falta para crear una cuenta.
 *
 * El teléfono va con su país, como en el resto de la aplicación: había un
 * «Cód. Área» de texto libre --valía una letra-- pegado al número en una sola
 * cadena y sin país, así que en Configuración salía la bandera de Colombia
 * junto a «+593 987654321» (13/10/2026).
 *
 * Dos campos se fueron: «Fecha de último ingreso al país» y «Motivo del
 * alojamiento». Se pedían y **no se guardaban en ningún sitio**; son datos de
 * una estancia, no de una cuenta, y los pide el preregistro del huésped.
 */
export const registroSchema = z
  .object({
    nombre: z.string().trim().min(2, "Mínimo 2 caracteres").max(80),
    apellido: z.string().trim().min(2, "Mínimo 2 caracteres").max(80),
    correo: z
      .string()
      .trim()
      .min(1, "Escribe tu correo")
      .email("Ese correo no parece válido"),
    codigoPais: z.string().min(2, "Elige el país del número"),
    telefono: z
      .string()
      .refine(
        (v) => /^\d{7,15}$/.test(v.replace(/\D/g, "")),
        "Entre 7 y 15 cifras",
      ),
    tipoDocumento: z.string().min(1, "Elige el tipo"),
    identificacion: z
      .string()
      .trim()
      .regex(/^[A-Za-z0-9.\- ]{5,20}$/, "Entre 5 y 20 letras o números"),
    // Ocho, que es lo que exige el servidor: con seis decía que valía y
    // después la rechazaba.
    password: z.string().min(8, "Mínimo 8 caracteres"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  });

export type RegistroFormData = z.infer<typeof registroSchema>;
