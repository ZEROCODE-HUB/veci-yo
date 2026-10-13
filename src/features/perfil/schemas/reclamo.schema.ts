import { z } from "zod";
import { AREAS, TIPOS_POR_AREA } from "../services";

/**
 * Los nombres de los campos siguen al modelo, no al prototipo: lo que el
 * formulario llama "Categoría" es el `area` (a qué se dirige) y lo que llama
 * "Subcategoría" es el `tipo` (qué es). Antes ambos se llamaban categoría y
 * subcategoría, con un tercer significado en la base.
 */
export const reclamoSchema = z
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

    const clave = Object.entries(AREAS).find(([, etiqueta]) => etiqueta === data.area)?.[0];
    const pideTipo =
      !!clave && TIPOS_POR_AREA[clave as keyof typeof TIPOS_POR_AREA].length > 0;

    if (pideTipo && !data.tipo) {
      ctx.addIssue({
        code: "custom",
        path: ["tipo"],
        message: "Selecciona una subcategoría",
      });
    }

    if (data.area === AREAS.aplicacion) {
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
    if (data.telefono.trim() && (cifras.length < 7 || cifras.length > 15)) {
      ctx.addIssue({
        code: "custom",
        path: ["telefono"],
        message: "Entre 7 y 15 cifras",
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
    if (data.titulo.trim().length > 120) {
      ctx.addIssue({
        code: "custom",
        path: ["titulo"],
        message: "El título no puede pasar de 120 caracteres",
      });
    }
  });

export type ReclamoFormularioValores = z.infer<typeof reclamoSchema>;
