import { z } from "zod";
export const coadministradorSchema = z.object({ nombre: z.string().trim().min(1), apellido: z.string(), correo: z.string().trim().email(), celular: z.string(), codigoPais: z.string(), permisos: z.record(z.boolean()) });
