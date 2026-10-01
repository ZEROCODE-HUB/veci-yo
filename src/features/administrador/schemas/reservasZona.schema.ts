import { z } from "zod";

/**
 * Lo que se edita de una reserva ya creada.
 *
 * Tenia tambien `nombre` y `depto`, que no se editan: quien reservo y sobre
 * que vivienda son claves foraneas y no se reasignan desde aqui.
 */
export const reservaZonaEditSchema = z.object({
  fecha: z.string(),
  horaInicio: z.string(),
  horaFin: z.string(),
  comentarios: z.string(),
});
