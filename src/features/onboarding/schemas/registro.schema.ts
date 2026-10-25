import { z } from "zod";
import { errorDeDocumento } from "@/features/visitas/helpers/validarVisita";
import type { ReglaDeDocumento } from "@/shared/services/documentos.repo";

/**
 * Lo que hace falta para crear una cuenta.
 *
 * El teléfono va con su país, como en el resto de la aplicación: había un
 * «Cód. Área» de texto libre --valía una letra-- pegado al número en una sola
 * cadena y sin país, así que en Configuración salía la bandera de Colombia
 * junto a «+593 987654321» (13/10/2026).
 *
 * Dos campos se fueron: «Fecha de último ingreso al país» y «Motivo del
 * alojamiento». Se pedían y **no se guardaban en ningún sitio**; son datos de
 * una estancia, no de una cuenta, y los pide el preregistro del huésped.
 *
 * Los largos (nombre, teléfono, contraseña) vienen de la base: quien arma el
 * formulario los lee y los pasa aquí.
 */
export interface LimitesDelRegistro {
  nombreMin: number;
  nombreMax: number;
  telefonoMin: number;
  telefonoMax: number;
  contrasenaMin: number;
  /** Los documentos que se ofrecen al registrarse, con su regla. */
  documentos: ReglaDeDocumento[];
}

export function crearEsquemaRegistro({
  nombreMin,
  nombreMax,
  telefonoMin,
  telefonoMax,
  contrasenaMin,
  documentos,
}: LimitesDelRegistro) {
  const nombre = z
    .string()
    .trim()
    .min(nombreMin, `Mínimo ${nombreMin} caracteres`)
    .max(nombreMax, `Máximo ${nombreMax} caracteres`);
  return z
    .object({
      nombre,
      apellido: nombre,
      correo: z
        .string()
        .trim()
        .min(1, "Escribe tu correo")
        .email("Ese correo no parece válido"),
      codigoPais: z.string().min(2, "Elige el país del número"),
      telefono: z
        .string()
        .refine(
          (v) => {
            const cifras = v.replace(/\D/g, "");
            return cifras.length >= telefonoMin && cifras.length <= telefonoMax;
          },
          `Entre ${telefonoMin} y ${telefonoMax} cifras`,
        ),
      tipoDocumento: z.string().min(1, "Elige el tipo"),
      identificacion: z.string().trim().min(1, "Escribe el número del documento"),
      // El mínimo de `contrasena_largo_minimo` (el inicio de sesión no pide
      // largo: solo que no esté vacía), que tiene que coincidir con lo que
      // exige el servidor de cuentas: con
      // menos decía que valía y después la rechazaba.
      password: z
        .string()
        .min(contrasenaMin, `Mínimo ${contrasenaMin} caracteres`),
      confirmPassword: z.string(),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: "Las contraseñas no coinciden",
      path: ["confirmPassword"],
    })
    // La regla de cada tipo de documento, de la base (`documento_del_pais`):
    // la edita el dueño de la plataforma por país (25/10/2026).
    .superRefine((data, ctx) => {
      const regla = documentos.find((d) => d.tipo === data.tipoDocumento);
      const error = errorDeDocumento(data.identificacion, regla);
      if (error) ctx.addIssue({ code: "custom", message: error, path: ["identificacion"] });
    });
}

export type RegistroFormData = z.infer<ReturnType<typeof crearEsquemaRegistro>>;
