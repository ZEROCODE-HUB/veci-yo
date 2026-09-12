import { z } from "zod";
export const gestionZonaSchema = z.object({
  id: z.string(), nombre: z.string().trim().min(1), tipo: z.string().min(1), descripcion: z.string(), imagen: z.string().nullable(),
  horarioApertura: z.string().min(1), horarioCierre: z.string().min(1), duracionMinima: z.number().min(1), duracionMaxima: z.number().min(1), tiempoMinimoEntreReservas: z.number().min(0), diasHabilitados: z.array(z.string()).min(1),
  fechasEspeciales: z.array(z.object({ fecha: z.string(), tipo: z.string(), motivo: z.string() })), montoGarantia: z.number().min(0), costoLimpieza: z.number().min(0), costoReserva: z.number().min(0), moneda: z.string().min(1), activa: z.boolean(),
  usaSlots: z.boolean().optional(), duracionPermitida: z.number().min(1).optional(), horariosDisponibles: z.array(z.string()).optional(), reglamento: z.string().optional(), requiereAprobacion: z.boolean().optional(), permiteCorta: z.boolean().optional(), permiteLarga: z.boolean().optional(),
});
