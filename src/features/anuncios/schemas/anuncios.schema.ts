import { z } from "zod";

export const anuncioSchema = z
  .object({
    tipo: z.enum(["Anuncio", "Encuesta"]),
    titulo: z.string().trim().min(1, "El titulo es obligatorio"),
    descripcion: z.string().trim().min(1, "La descripcion es obligatoria"),
    categoria: z.string().min(1, "Selecciona una categoria"),
    paraPropietarios: z.boolean(),
    paraResidentes: z.boolean(),
    paraHuespedes: z.boolean(),
    urlVideo: z.string(),
    votacion: z.boolean(),
    umbral: z.string(),
    tiempoMaximo: z.string(),
    fechaPublicada: z.date().nullable(),
    fechaFinalizacion: z.date().nullable(),
    opcionesVotacion: z.array(z.object({ valor: z.string() })).min(2),
    ocultarResultados: z.boolean(),
    votacionMultiple: z.boolean(),
  })
  .superRefine((value, ctx) => {
    if (
      value.tipo === "Encuesta" &&
      value.opcionesVotacion.filter((item) => item.valor.trim()).length < 2
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["opcionesVotacion"],
        message: "Agrega al menos dos opciones",
      });
    }
  });
