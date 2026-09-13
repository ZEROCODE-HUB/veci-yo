import { z } from "zod";

const bloqueSchema = z.object({
  inicio: z.string(),
  fin: z.string(),
});

const fechaEspecialSchema = z.object({
  fecha: z.string(),
  tipo: z.string(),
  motivo: z.string(),
  horaApertura: z.string().optional(),
  horaCierre: z.string().optional(),
});

export const gestionZonaSchema = z
  .object({
    id: z.string(),
    nombre: z.string().trim().min(1, "El nombre de la zona es obligatorio."),
    tipo: z.string().min(1, "Debes seleccionar un tipo de zona."),
    descripcion: z.string(),
    imagen: z.string().nullable(),
    horarioApertura: z.string().min(1),
    horarioCierre: z.string().min(1),
    duracionMinima: z.number().min(1, "La duración mínima debe ser al menos 1 minuto."),
    duracionMaxima: z.number().min(1),
    tiempoMinimoEntreReservas: z.number().min(0, "El tiempo entre reservas no puede ser negativo."),
    diasHabilitados: z.array(z.string()).min(1, "Debes habilitar al menos un día."),
    fechasEspeciales: z.array(fechaEspecialSchema),
    montoGarantia: z.number().min(0),
    costoLimpieza: z.number().min(0),
    costoReserva: z.number().min(0),
    moneda: z.string().min(1),
    activa: z.boolean(),
    usaSlots: z.boolean(),
    duracionPermitida: z.number().min(1),
    horariosDisponibles: z.array(z.string()),
    reglamento: z.string(),
    requiereAprobacion: z.boolean(),
    permiteCorta: z.boolean(),
    permiteLarga: z.boolean(),
    cantidadBloques: z.number().min(1).max(8),
    bloques: z.array(bloqueSchema),
  })
  .superRefine((data, context) => {
    if (data.horarioApertura >= data.horarioCierre) {
      context.addIssue({ code: "custom", path: ["horarioCierre"], message: "La hora de apertura debe ser anterior a la de cierre." });
    }
    if (data.duracionMaxima < data.duracionMinima) {
      context.addIssue({ code: "custom", path: ["duracionMaxima"], message: "La duración máxima no puede ser menor que la mínima." });
    }
    if (data.usaSlots) {
      data.bloques.slice(0, data.cantidadBloques).forEach((bloque, index) => {
        if (!bloque.inicio || !bloque.fin) {
          context.addIssue({ code: "custom", path: ["bloques", index], message: `Bloque ${index + 1}: define la hora de inicio y fin.` });
        } else if (bloque.inicio >= bloque.fin) {
          context.addIssue({ code: "custom", path: ["bloques", index], message: `Bloque ${index + 1}: la hora de inicio debe ser anterior a la de fin.` });
        }
      });
    }
    const fechas = new Set<string>();
    data.fechasEspeciales.forEach((fecha, index) => {
      if (!fecha.fecha) context.addIssue({ code: "custom", path: ["fechasEspeciales", index, "fecha"], message: `Fecha especial #${index + 1}: la fecha es obligatoria.` });
      if (fechas.has(fecha.fecha)) context.addIssue({ code: "custom", path: ["fechasEspeciales", index, "fecha"], message: `La fecha especial "${fecha.fecha}" está duplicada.` });
      fechas.add(fecha.fecha);
      if (!fecha.motivo.trim()) context.addIssue({ code: "custom", path: ["fechasEspeciales", index, "motivo"], message: `El motivo de "${fecha.fecha}" es obligatorio.` });
      if (fecha.tipo === "horario_especial" && (!fecha.horaApertura || !fecha.horaCierre)) context.addIssue({ code: "custom", path: ["fechasEspeciales", index], message: `El horario especial de "${fecha.fecha}" requiere apertura y cierre.` });
      if (fecha.tipo === "horario_especial" && fecha.horaApertura && fecha.horaCierre && fecha.horaApertura >= fecha.horaCierre) context.addIssue({ code: "custom", path: ["fechasEspeciales", index], message: `La apertura debe ser anterior al cierre en "${fecha.fecha}".` });
    });
  });
