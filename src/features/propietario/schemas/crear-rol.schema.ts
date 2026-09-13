import { z } from "zod";

export const crearRolSchema = z.object({
  rol: z.string().min(1, "Selecciona un rol"),
  nombre: z.string().min(2, "Mínimo 2 caracteres"),
  correo: z.string().email("Correo inválido").optional().or(z.literal("")),
  tipo: z.string().optional(),
  ci: z.string().min(5, "Mínimo 5 caracteres").optional().or(z.literal("")),
  codigoArea: z.string().optional(),
  telefono: z.string().optional(),
  menorEdad: z.boolean().default(false),
  contactoNombre: z.string().optional(),
  contactoCodigo: z.string().optional(),
  contactoTelefono: z.string().optional(),
  fechaInicio: z.string().optional(),
  duracion: z.string().optional(),
  montoAlquiler: z.string().optional(),
  monitoreoPago: z.boolean().default(false),
  esAnfitrionPrimario: z.boolean().default(false),
  esAdministradorPrimario: z.boolean().default(false),
  datosVisibles: z.boolean().default(true),
  contactableChat: z.boolean().default(true),
  contactableWhatsapp: z.boolean().default(true),
});

export type CrearRolFormData = z.infer<typeof crearRolSchema>;
