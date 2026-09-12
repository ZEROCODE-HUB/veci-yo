import { z } from "zod";

const contactSchema = z.object({
  nombre: z.string(),
  telefono: z.string(),
  correo: z.string(),
});

const teamMemberSchema = contactSchema.extend({
  cargo: z.string(),
});

export const condominioSchema = z.object({
  nombre: z.string().min(1, "El nombre es requerido"),
  direccion: z.string(),
  ruc: z.string(),
  foto: z.string().nullable(),
  numTorres: z.string(),
  sotanosCompartidos: z.string(),
  porteriaCompartida: z.string(),
  ingresosVehiculares: z.string(),
  ingresosPeatonales: z.string(),
  team: z.array(teamMemberSchema),
  security: contactSchema,
  cleaning: contactSchema,
});

export const towerSchema = z.object({
  nombre: z.string().min(1, "El nombre es requerido"),
  depto: z.string(),
  penthouse: z.string(),
  tipo: z.string(),
  nomenclaturaDesde: z.string(),
  nomenclaturaHasta: z.string(),
  pisos: z.string(),
  sotanos: z.string(),
  cocherasVisitas: z.string(),
  cocherasPrivadas: z.string(),
  almacenPrivados: z.string(),
  entradasPeatonales: z.string(),
  entradasVehiculares: z.string(),
  ubicacionParkingVisitas: z.string(),
});

export const unitSchema = z.object({
  codigo: z.string().min(1, "El codigo es requerido"),
  piso: z.string().min(1, "El piso es requerido"),
  estado: z.string().min(1, "El estado es requerido"),
});

export const depositSchema = z.object({
  codigo: z.string().min(1, "El codigo es requerido"),
  ubicacion: z.string(),
  unidadId: z.string(),
});

export const porteriaSchema = z.object({
  nombre: z.string().min(1, "El nombre es requerido"),
  ubicacion: z.string(),
  telefono: z.string(),
});
