import { z } from "zod";

export const aceptacionSchema = z.object({
  permiteRentaCorta: z.boolean(),
  permiteMascotas: z.boolean(),
  aptoNinos: z.boolean(),
});

export const vehiculoSchema = z.object({
  placa: z.string().min(1, "Ingresa la placa del vehículo"),
  tipo: z.string().min(1),
});

export const pagoSuscripcionSchema = z.object({
  cardNumber: z.string().min(1),
  cardName: z.string().min(1),
  cardExpiry: z.string().min(1),
  cardCvv: z.string().min(1),
});

export type AceptacionFormData = z.infer<typeof aceptacionSchema>;
export type VehiculoFormData = z.infer<typeof vehiculoSchema>;
export type PagoSuscripcionFormData = z.infer<typeof pagoSuscripcionSchema>;
