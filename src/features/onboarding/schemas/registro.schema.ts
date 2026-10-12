import { z } from "zod";

export const registroSchema = z
  .object({
    nombre: z.string().min(2, "Mínimo 2 caracteres"),
    apellido: z.string().min(2, "Mínimo 2 caracteres"),
    correo: z.string().email("Correo inválido"),
    codArea: z.string().min(1, "Requerido"),
    telefono: z.string().min(5, "Mínimo 5 caracteres"),
    tipoDocumento: z.string().min(1, "Selecciona un tipo"),
    identificacion: z.string().min(5, "Mínimo 5 caracteres"),
    fechaUltimoIngreso: z.string().optional(),
    motivoAlojamiento: z.string().optional(),
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
