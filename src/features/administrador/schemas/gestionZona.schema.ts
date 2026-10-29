import { z } from "zod";

const fechaEspecialSchema = z.object({
  fecha: z.string(),
  tipo: z.string(),
  motivo: z.string(),
  horaApertura: z.string().optional(),
  horaCierre: z.string().optional(),
});

/*
  `HH:mm` con ceros. La apertura y el cierre eran texto libre y se comparaban
  como texto: «8:00» contra «22:00» daba «la apertura debe ser anterior al
  cierre», y «25:99» pasaba y reventaba en la base, en inglés.
*/
const HORA = /^(([01]\d|2[0-3]):[0-5]\d|24:00)$/;

/**
 * El esquema del formulario de una zona.
 *
 * Es una función porque el tope de duración de una reserva lo pone la
 * plataforma (`zona_duracion_rango_maximo`, en minutos): era un 1440 escrito
 * aquí, que dejaba fuera, por ejemplo, una casa de huéspedes que se reserva
 * por noches. Quien arma el formulario lo lee y lo pasa.
 */
export function crearGestionZonaSchema({
  duracionRangoMaximo,
}: {
  duracionRangoMaximo: number;
}) {
  return z
    .object({
      id: z.string(),
      nombre: z.string().trim().min(1, "El nombre de la zona es obligatorio."),
      tipo: z.string().min(1, "Debes seleccionar un tipo de zona."),
      descripcion: z.string(),
      imagen: z.string().nullable(),
      horarioApertura: z.string().regex(HORA, "Elige la hora de apertura."),
      horarioCierre: z.string().regex(HORA, "Elige la hora de cierre."),
      duracionMinimaMin: z
        .number({ invalid_type_error: "La duración mínima es un número." })
        .int("La duración mínima va en minutos enteros.")
        .min(1, "La duración mínima debe ser al menos 1 minuto.")
        .max(
          duracionRangoMaximo,
          `La duración mínima no puede pasar de ${duracionRangoMaximo} minutos.`,
        ),
      duracionMaximaMin: z
        .number({ invalid_type_error: "La duración máxima es un número." })
        .int("La duración máxima va en minutos enteros.")
        .min(1, "La duración máxima debe ser al menos 1 minuto.")
        .max(
          duracionRangoMaximo,
          `La duración máxima no puede pasar de ${duracionRangoMaximo} minutos.`,
        ),
      tiempoMinimoEntreReservas: z.number().min(0, "El tiempo entre reservas no puede ser negativo."),
      // Aforo: 0 es «sin límite», igual que en la base.
      capacidadMaxima: z
        .number({ invalid_type_error: "La capacidad es un número." })
        .int()
        .min(0, "La capacidad no puede ser negativa."),
      cuposSimultaneos: z
        .number({ invalid_type_error: "Las reservas a la vez son un número." })
        .int()
        .min(1, "Tiene que caber al menos una reserva a la vez."),
      diasHabilitados: z.array(z.string()).min(1, "Debes habilitar al menos un día."),
      fechasEspeciales: z.array(fechaEspecialSchema),
      montoGarantia: z
        .number({ invalid_type_error: "La garantía es un número." })
        .min(0, "La garantía no puede ser negativa."),
      costoLimpieza: z
        .number({ invalid_type_error: "El costo de limpieza es un número." })
        .min(0, "El costo de limpieza no puede ser negativo."),
      costoReserva: z
        .number({ invalid_type_error: "El costo de reserva es un número." })
        .min(0, "El costo de reserva no puede ser negativo."),
      moneda: z.string().min(1),
      activa: z.boolean(),
      usaSlots: z.boolean(),
      eligeNumero: z.boolean(),
      horariosDisponibles: z.array(z.string()),
      reglamento: z.string(),
      requiereAprobacion: z.boolean(),
      condicionesAprobacion: z.string(),
      icono: z.string(),
      permiteCorta: z.boolean(),
      permiteLarga: z.boolean(),
    })
    .superRefine((data, context) => {
      if (data.horarioApertura >= data.horarioCierre) {
        context.addIssue({ code: "custom", path: ["horarioCierre"], message: "La hora de apertura debe ser anterior a la de cierre." });
      }
      if (data.duracionMaximaMin < data.duracionMinimaMin) {
        context.addIssue({ code: "custom", path: ["duracionMaximaMin"], message: "La duración máxima no puede ser menor que la mínima." });
      }
      const fechas = new Set<string>();
      data.fechasEspeciales.forEach((fecha, index) => {
        if (fecha.fecha && !/^\d{4}-\d{2}-\d{2}$/.test(fecha.fecha)) context.addIssue({ code: "custom", path: ["fechasEspeciales", index, "fecha"], message: `Fecha especial #${index + 1}: elige la fecha en el calendario.` });
        if (!fecha.fecha) context.addIssue({ code: "custom", path: ["fechasEspeciales", index, "fecha"], message: `Fecha especial #${index + 1}: la fecha es obligatoria.` });
        if (fechas.has(fecha.fecha)) context.addIssue({ code: "custom", path: ["fechasEspeciales", index, "fecha"], message: `La fecha especial "${fecha.fecha}" está duplicada.` });
        fechas.add(fecha.fecha);
        if (!fecha.motivo.trim()) context.addIssue({ code: "custom", path: ["fechasEspeciales", index, "motivo"], message: `El motivo de "${fecha.fecha}" es obligatorio.` });
        if (fecha.tipo === "horario_especial" && (!fecha.horaApertura || !fecha.horaCierre)) context.addIssue({ code: "custom", path: ["fechasEspeciales", index], message: `El horario especial de "${fecha.fecha}" requiere apertura y cierre.` });
        if (fecha.tipo === "horario_especial" && fecha.horaApertura && fecha.horaCierre && fecha.horaApertura >= fecha.horaCierre) context.addIssue({ code: "custom", path: ["fechasEspeciales", index], message: `La apertura debe ser anterior al cierre en "${fecha.fecha}".` });
      });
    });
}
