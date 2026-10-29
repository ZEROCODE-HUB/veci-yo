import { z } from "zod";

/**
 * Los nombres de los campos siguen al modelo, no al prototipo: lo que el
 * formulario llama "Categoría" es el `area` (a qué se dirige) y lo que llama
 * "Subcategoría" es el `tipo` (qué es). Antes ambos se llamaban categoría y
 * subcategoría, con un tercer significado en la base.
 *
 * El largo del teléfono y del título vienen de la base; quien arma el
 * formulario los lee y los pasa. También qué áreas piden tipo, que sale de la
 * lista `areas_de_pqrs` (28/10/2026): `area` y `tipo` son códigos.
 */
export interface LimitesDelReclamo {
  telefonoMin: number;
  telefonoMax: number;
  tituloMax: number;
  /** Si el área (por código) ofrece tipos: entonces hay que elegir uno. */
  areaPideTipo: (area: string) => boolean;
}

export function crearEsquemaReclamo({
  telefonoMin,
  telefonoMax,
  tituloMax,
  areaPideTipo,
}: LimitesDelReclamo) {
  return z
    .object({
      titulo: z.string(),
      descripcion: z.string(),
      modelo: z.string(),
      area: z.string(),
      tipo: z.string(),
      destinatario: z.string(),
      correo: z.string(),
      telefono: z.string(),
      codigoPais: z.string(),
      medioContacto: z.string(),
      /*
        Opcional a proposito: la mayoria de las quejas del edificio no van contra
        nadie --una farola fundida, el ascensor-- y obligar a señalar una vivienda
        convertiria cada queja en una denuncia.
      */
      unidadDenunciada: z.string().optional(),
    })
    .superRefine((data, ctx) => {
      const requerido = (campo: keyof typeof data, mensaje = "Campo requerido") => {
        if (!String(data[campo]).trim()) {
          ctx.addIssue({ code: "custom", path: [campo], message: mensaje });
        }
      };

      requerido("titulo");
      requerido("descripcion");
      requerido("area", "Selecciona una categoría");

      if (data.area && areaPideTipo(data.area) && !data.tipo) {
        ctx.addIssue({
          code: "custom",
          path: ["tipo"],
          message: "Selecciona una subcategoría",
        });
      }

      // Por código y no por nombre: el nombre lo cambia el administrador, y la
      // restricción `reclamo_modelo_solo_para_app` habla del código.
      if (data.area === "aplicacion") {
        requerido("modelo");
      }

      /*
        El contacto no se validaba: «ana@» pasaba por correo, «12» por teléfono,
        y se podía elegir «Teléfono» como medio preferido sin haber puesto
        ninguno (13/10/2026). La administración se quedaba sin cómo responder.
      */
      const correo = data.correo.trim();
      if (correo && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(correo)) {
        ctx.addIssue({
          code: "custom",
          path: ["correo"],
          message: "Ese correo no parece válido",
        });
      }
      const cifras = data.telefono.replace(/\D/g, "");
      if (
        data.telefono.trim() &&
        (cifras.length < telefonoMin || cifras.length > telefonoMax)
      ) {
        ctx.addIssue({
          code: "custom",
          path: ["telefono"],
          message: `Entre ${telefonoMin} y ${telefonoMax} cifras`,
        });
      }
      if (/tel[eé]fono|whatsapp|llamada/i.test(data.medioContacto) && !cifras) {
        ctx.addIssue({
          code: "custom",
          path: ["telefono"],
          message: "Escribe el teléfono al que quieres que te contacten",
        });
      }
      if (/correo/i.test(data.medioContacto) && !correo) {
        ctx.addIssue({
          code: "custom",
          path: ["correo"],
          message: "Escribe el correo al que quieres que te contacten",
        });
      }
      if (data.titulo.trim().length > tituloMax) {
        ctx.addIssue({
          code: "custom",
          path: ["titulo"],
          message: `El título no puede pasar de ${tituloMax} caracteres`,
        });
      }
    });
}

export type ReclamoFormularioValores = z.infer<
  ReturnType<typeof crearEsquemaReclamo>
>;
