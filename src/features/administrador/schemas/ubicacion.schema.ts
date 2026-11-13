import { z } from "zod";

/**
 * Los datos del condominio.
 *
 * No validaba nada: los ocho campos eran `z.string()` a secas, así que se
 * podía guardar un edificio **sin nombre** --y el nombre sale en cada pantalla
 * y en cada correo--, un correo sin arroba y un teléfono de dos cifras
 * (13/10/2026).
 *
 * Desde el 13/11/2026 solo se editan nombre, dirección e identificación
 * fiscal: el resto lo pone la plataforma al crear el edificio, o sale de la
 * cuenta del administrador.
 */
export function crearEsquemaUbicacion() {
  /*
    Ciudad, país, moneda, zona horaria y número de la policía ya no se editan
    aquí (13/11/2026): los pone la plataforma al dar de alta el edificio.
  */
  return z.object({
    nombre: z.string().trim().min(1, "Escribe el nombre del condominio."),
    direccion: z.string().trim().min(1, "Escribe la dirección."),
    codigoPais: z.string(),
    // Viajan sin tocarse: ya no se editan aquí y el guardado no los escribe.
    ciudad: z.string(),
    pais: z.string(),
    moneda: z.string(),
    zonaHoraria: z.string(),
    telefonoPolicia: z.string(),
    ruc: z.string(),
    // Ya no se editan aquí (13/11/2026): el contacto es el de la cuenta del
    // administrador. Viajan sin tocarse y el guardado no los escribe.
    telefono: z.string(),
    horarioAtencion: z.string(),
    email: z.string(),
  });
}
