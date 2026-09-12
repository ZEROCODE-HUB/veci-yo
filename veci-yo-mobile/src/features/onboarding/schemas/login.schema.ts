import { z } from "zod";

export const loginSchema = z.object({
  correo: z.string().min(1, "El correo es requerido").email("Correo inválido"),
  password: z.string().min(6, "Mínimo 6 caracteres"),
});

export type LoginFormData = z.infer<typeof loginSchema>;
