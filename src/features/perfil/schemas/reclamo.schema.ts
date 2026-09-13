import { z } from "zod";

export const reclamoSchema = z
  .object({
    titulo: z.string(),
    descripcion: z.string(),
    modelo: z.string(),
    categoria: z.string(),
    subcategoria: z.string(),
    destinatario: z.string(),
    correo: z.string(),
    telefono: z.string(),
    medioContacto: z.string(),
    departamentoDenunciado: z.string(),
    torreDenunciada: z.string(),
    viviendaDenunciada: z.string(),
  })
  .superRefine((data, ctx) => {
    if (!data.titulo.trim())
      ctx.addIssue({
        code: "custom",
        path: ["titulo"],
        message: "Campo requerido",
      });
    if (!data.descripcion.trim())
      ctx.addIssue({
        code: "custom",
        path: ["descripcion"],
        message: "Campo requerido",
      });
    if (!data.categoria)
      ctx.addIssue({
        code: "custom",
        path: ["categoria"],
        message: "Selecciona una categoría",
      });

    const categoria = data.categoria;
    const tieneSubcategorias =
      categoria === "Condominio" || categoria === "Aplicación VeciYo";
    if (tieneSubcategorias && !data.subcategoria) {
      ctx.addIssue({
        code: "custom",
        path: ["subcategoria"],
        message: "Selecciona una subcategoría",
      });
    }
    if (categoria === "Aplicación VeciYo" && !data.modelo.trim()) {
      ctx.addIssue({
        code: "custom",
        path: ["modelo"],
        message: "Campo requerido",
      });
    }
  });

export type ReclamoFormularioValores = z.infer<typeof reclamoSchema>;
