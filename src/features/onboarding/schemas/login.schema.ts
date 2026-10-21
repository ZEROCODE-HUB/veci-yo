import { z } from "zod";

/**
 * Entrar con correo y contraseña.
 *
 * Aquí no se mira el largo de la contraseña: ese mínimo
 * (`contrasena_largo_minimo`) es para crearla o cambiarla. Al entrar, exigirlo
 * dejaría fuera a quien tiene una contraseña de antes de que el mínimo subiera,
 * sin decirle por qué. Quien decide si es correcta es Supabase.
 */
export const esquemaLogin = z.object({
  correo: z.string().min(1, "El correo es requerido").email("Correo inválido"),
  password: z.string().min(1, "La contraseña es requerida"),
});

export type LoginFormData = z.infer<typeof esquemaLogin>;
