import { z } from "zod";

/**
 * Los datos del condominio.
 *
 * No validaba nada: los ocho campos eran `z.string()` a secas, así que se
 * podía guardar un edificio **sin nombre** --y el nombre sale en cada pantalla
 * y en cada correo--, un correo sin arroba y un teléfono de dos cifras
 * (13/10/2026).
 */
export const ubicacionSchema = z.object({
  nombre: z.string().trim().min(1, "Escribe el nombre del condominio."),
  direccion: z.string().trim().min(1, "Escribe la dirección."),
  ciudad: z.string(),
  pais: z.string().regex(/^[A-Z]{2}$/, "Elige el país."),
  codigoPais: z.string(),
  ruc: z.string(),
  // Opcional; si se escribe, tiene que poderse marcar.
  telefono: z.string().refine((valor) => {
    const cifras = valor.replace(/[^0-9]/g, "");
    return valor.trim() === "" || (cifras.length >= 7 && cifras.length <= 15);
  }, "Revisa el teléfono: tiene que tener entre 7 y 15 cifras."),
  // Un numero corto de emergencias: 3 a 6 cifras. Vacio = el del pais.
  telefonoPolicia: z
    .string()
    .trim()
    .refine(
      (valor) => valor === "" || /^[0-9]{3,6}$/.test(valor),
      "El número de la policía tiene que tener entre 3 y 6 cifras.",
    ),
  moneda: z.string().regex(/^[A-Z]{3}$/, "Elige la moneda."),
  zonaHoraria: z.string().min(1, "Elige la zona horaria."),
  horarioAtencion: z
    .string()
    .max(200, "El horario de atención es muy largo."),
  email: z
    .string()
    .trim()
    .refine(
      (valor) => valor === "" || /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(valor),
      "Ese correo no parece válido.",
    ),
});
