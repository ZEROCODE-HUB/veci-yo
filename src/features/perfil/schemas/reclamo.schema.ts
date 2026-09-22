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
    medioContacto: z.string(),
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
  });

export type ReclamoFormularioValores = z.infer<typeof reclamoSchema>;
