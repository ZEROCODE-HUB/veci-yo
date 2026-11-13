import { z } from "zod";

/**
 * Los datos del condominio.
 *
 * No validaba nada: los ocho campos eran `z.string()` a secas, así que se
 * podía guardar un edificio **sin nombre** --y el nombre sale en cada pantalla
 * y en cada correo--, un correo sin arroba y un teléfono de dos cifras
 * (13/10/2026).
 *
 * Los largos del teléfono y del horario de atención los pone la base; quien
 * arma el formulario los lee y los pasa.
 */
export interface LimitesDeUbicacion {
  telefonoMin: number;
  telefonoMax: number;
  horarioMax: number;
}

export function crearEsquemaUbicacion({
  telefonoMin,
  telefonoMax,
  horarioMax,
}: LimitesDeUbicacion) {
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
    // Opcional; si se escribe, tiene que poderse marcar.
    telefono: z.string().refine((valor) => {
      const cifras = valor.replace(/[^0-9]/g, "");
      return (
        valor.trim() === "" ||
        (cifras.length >= telefonoMin && cifras.length <= telefonoMax)
      );
    }, `Revisa el teléfono: tiene que tener entre ${telefonoMin} y ${telefonoMax} cifras.`),
    horarioAtencion: z
      .string()
      .max(
        horarioMax,
        `El horario de atención es muy largo: hasta ${horarioMax} caracteres.`,
      ),
    email: z
      .string()
      .trim()
      .refine(
        (valor) => valor === "" || /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(valor),
        "Ese correo no parece válido.",
      ),
  });
}
