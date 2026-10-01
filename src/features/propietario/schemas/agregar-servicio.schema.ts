import { z } from "zod";

export const agregarServicioSchema = z.object({
  nombreServicio: z.string().min(1, "Nombre del servicio requerido"),
  nombreEmpresa: z.string().optional(),
  numeroCliente: z.string().optional(),
  numeroMedidor: z.string().optional(),
  primerAviso: z.string().optional(),
  segundoAviso: z.string().optional(),
  correoFactura: z
    .string()
    .email("Correo inválido")
    .optional()
    .or(z.literal("")),
  codigoArea: z.string().optional(),
  numeroTelefono: z.string().optional(),
});

export type AgregarServicioFormData = z.infer<typeof agregarServicioSchema>;
