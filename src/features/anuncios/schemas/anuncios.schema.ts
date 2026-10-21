import { z } from "zod";
import { formatDateInput } from "@/shared/utils";

/**
 * Lo que hace falta para publicar un anuncio o una encuesta.
 *
 * Los mensajes son nuestros y con tilde. Y cada regla está aquí porque
 * faltaba (13/10/2026): se podía publicar **sin audiencia** --«¡se publicó
 * con éxito!» y no lo veía nadie--, con dos opciones iguales, o con una fecha
 * de cierre anterior a la de publicación, que la base rechazaba sin que la
 * pantalla dijera nada.
 *
 * Los largos y el mínimo de opciones vienen de la base; quien arma el
 * formulario los lee y los pasa aquí.
 */
export interface LimitesDelAnuncio {
  tituloMax: number;
  descripcionMax: number;
  opcionesMin: number;
}

export function crearEsquemaAnuncio({
  tituloMax,
  descripcionMax,
  opcionesMin,
}: LimitesDelAnuncio) {
  return z
    .object({
      tipo: z.enum(["Anuncio", "Encuesta"]),
      titulo: z
        .string()
        .trim()
        .min(1, "Escribe el título")
        .max(tituloMax, `El título no puede pasar de ${tituloMax} caracteres`),
      descripcion: z
        .string()
        .trim()
        .min(1, "Escribe la descripción")
        .max(
          descripcionMax,
          `La descripción no puede pasar de ${descripcionMax} caracteres`,
        ),
      categoria: z.string().min(1, "Elige una categoría"),
      paraPropietarios: z.boolean(),
      paraResidentes: z.boolean(),
      paraHuespedes: z.boolean(),
      paraPorteria: z.boolean(),
      urlVideo: z
        .string()
        .trim()
        .refine(
          (v) => v === "" || /^https?:\/\/\S+\.\S+/.test(v),
          "El enlace del video tiene que empezar por http:// o https://",
        ),
      votacion: z.boolean(),
      umbral: z
        .string()
        .refine(
          (v) => v === "" || (/^\d+$/.test(v) && Number(v) >= 1 && Number(v) <= 100),
          "El umbral es un porcentaje entre 1 y 100",
        ),
      fechaPublicada: z.date().nullable(),
      fechaFinalizacion: z.date().nullable(),
      opcionesVotacion: z.array(z.object({ valor: z.string() })),
      ocultarResultados: z.boolean(),
      votacionMultiple: z.boolean(),
      avisar: z.boolean(),
    })
    .superRefine((value, ctx) => {
      if (!value.paraPropietarios && !value.paraResidentes && !value.paraHuespedes && !value.paraPorteria) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["paraPropietarios"],
          message: "Elige a quién va dirigido",
        });
      }

      /*
        Las fechas se comparan por **día**, en `yyyy-MM-dd`. El cierre puede ser
        el mismo día de la publicación: la encuesta vale hasta el final de ese
        día. Antes una encuesta de un solo día era imposible.
      */
      const hoy = formatDateInput(new Date());
      const publica = value.fechaPublicada
        ? formatDateInput(value.fechaPublicada)
        : hoy;
      if (value.fechaFinalizacion) {
        const cierra = formatDateInput(value.fechaFinalizacion);
        if (cierra < hoy) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["fechaFinalizacion"],
            message: "La fecha de finalización ya pasó",
          });
        } else if (cierra < publica) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["fechaFinalizacion"],
            message: "La finalización no puede ser anterior a la publicación",
          });
        }
      }

      if (value.tipo !== "Encuesta") return;

      const opciones = value.opcionesVotacion
        .map((item) => item.valor.trim())
        .filter(Boolean);
      if (opciones.length < opcionesMin) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["opcionesVotacion"],
          message: `Una encuesta necesita al menos ${opcionesMin} opciones`,
        });
      }
      const vistas = new Set(opciones.map((o) => o.toLowerCase()));
      if (vistas.size !== opciones.length) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["opcionesVotacion"],
          message: "Hay dos opciones iguales",
        });
      }
    });
}
