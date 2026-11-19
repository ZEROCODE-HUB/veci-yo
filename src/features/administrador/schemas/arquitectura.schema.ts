import { z } from "zod";
import { Constants } from "@/shared/types/database.types";
import { problemaDelIndice } from "../helpers/indiceDeVotacion";

const contactSchema = z.object({
  nombre: z.string(),
  telefono: z.string(),
  correo: z.string(),
});

const teamMemberSchema = contactSchema.extend({
  cargo: z.string(),
});

export const condominioSchema = z.object({
  nombre: z.string().min(1, "El nombre es requerido"),
  direccion: z.string(),
  ruc: z.string(),
  foto: z.string().nullable(),
  numTorres: z.string(),
  sotanosCompartidos: z.string(),
  porteriaCompartida: z.string(),
  ingresosVehiculares: z.string(),
  ingresosPeatonales: z.string(),
  team: z.array(teamMemberSchema),
  security: contactSchema,
  cleaning: contactSchema,
});

// Un conteo de la torre: vacío o un número entero, sin letras.
const conteo = z.string().regex(/^\d{0,3}$/, "Escribe solo un número");

export const towerSchema = z.object({
  nombre: z.string().min(1, "El nombre es requerido"),
  depto: conteo,
  penthouse: conteo,
  tipo: z.string(),
  nomenclaturaDesde: z.string(),
  nomenclaturaHasta: z.string(),
  pisos: conteo,
  sotanos: conteo,
  cocherasVisitas: conteo,
  cocherasPrivadas: conteo,
  almacenPrivados: conteo,
  entradasPeatonales: conteo,
  entradasVehiculares: conteo,
  ubicacionParkingVisitas: z.string(),
  // Lo que se construye al crear (16/11/2026). Que el conjunto tenga sentido
  // --hasta no menor que desde, cuántos caben-- lo dice `planDeTorre`, que es
  // lo mismo que enseña la vista previa.
  pisoDesde: conteo,
  pisoHasta: conteo,
  porPiso: conteo,
  numeracion: z.enum(["numero", "letra"]),
  cocherasPorNivel: z.record(z.string(), z.object({ privados: conteo, visita: conteo })),
  nivelesNuevos: z.array(z.object({ nombre: z.string(), nomenclatura: z.string() })),
});

export const unitSchema = z.object({
  codigo: z.string().min(1, "El codigo es requerido"),
  piso: z.string().min(1, "El piso es requerido"),
  estado: z.enum(Constants.public.Enums.estado_unidad),
  tipologiaId: z.string(),
  // Índice de votación en % del edificio (18/11/2026): vacío, o de más de 0 a 100.
  indiceVotacion: z.string().superRefine((v, ctx) => {
    const problema = problemaDelIndice(v);
    if (problema) ctx.addIssue({ code: z.ZodIssueCode.custom, message: problema });
  }),
});

export const depositSchema = z.object({
  codigo: z.string().min(1, "El codigo es requerido"),
  ubicacion: z.string(),
  unidadId: z.string(),
});

export const estacionamientoSchema = z.object({
  codigo: z.string().min(1, "El codigo es requerido"),
  tipo: z.enum(["visitante", "privado"]),
  // «Ubicación obligatoria al crear Estacionamiento» (16/11/2026): el nivel.
  nivelId: z.string().min(1, "Elige el nivel"),
  ubicacion: z.string(),
  unidadId: z.string(),
});

export const porteriaSchema = z
  .object({
    nombre: z.string().min(1, "El nombre es requerido"),
    tipo: z.enum(Constants.public.Enums.tipo_porteria),
    ubicacion: z.string(),
    telefono: z.string(),
    codigoPais: z.string(),
    torreId: z.string(),
  })
  // Una garita de torre sin torre no dice de dónde es (16/11/2026).
  .refine((v) => v.tipo !== "garita_torre" || v.torreId !== "", {
    message: "Elige la torre",
    path: ["torreId"],
  });
