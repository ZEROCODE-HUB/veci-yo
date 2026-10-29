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
  /** Cifras del número de emergencias (`emergencias_largo_*`, 28/10/2026). */
  emergenciasMin: number;
  emergenciasMax: number;
}

export function crearEsquemaUbicacion({
  telefonoMin,
  telefonoMax,
  horarioMax,
  emergenciasMin,
  emergenciasMax,
}: LimitesDeUbicacion) {
  return z.object({
    nombre: z.string().trim().min(1, "Escribe el nombre del condominio."),
    direccion: z.string().trim().min(1, "Escribe la dirección."),
    ciudad: z.string(),
    pais: z.string().regex(/^[A-Z]{2}$/, "Elige el país."),
    codigoPais: z.string(),
    ruc: z.string(),
    // Opcional; si se escribe, tiene que poderse marcar.
    telefono: z.string().refine((valor) => {
      const cifras = valor.replace(/[^0-9]/g, "");
      return (
        valor.trim() === "" ||
        (cifras.length >= telefonoMin && cifras.length <= telefonoMax)
      );
    }, `Revisa el teléfono: tiene que tener entre ${telefonoMin} y ${telefonoMax} cifras.`),
    // Un numero corto de emergencias, con el largo de la base. Vacio = el del pais.
    telefonoPolicia: z
      .string()
      .trim()
      .refine(
        (valor) =>
          valor === "" ||
          (/^[0-9]+$/.test(valor) && valor.length >= emergenciasMin && valor.length <= emergenciasMax),
        `El número de la policía tiene que tener entre ${emergenciasMin} y ${emergenciasMax} cifras.`,
      ),
    moneda: z.string().regex(/^[A-Z]{3}$/, "Elige la moneda."),
    zonaHoraria: z.string().min(1, "Elige la zona horaria."),
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
