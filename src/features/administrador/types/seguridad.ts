import type { Guardia, Turno, TurnoOverride } from "@/shared/types";
import { formatRangoHoras } from "@/shared/utils";

export type GuardiaFormValues = Omit<Guardia, "id">;

export type SecurityView = "list" | "form" | "confirmation";

export type RecurringScheduleFormValues = {
  horaInicio: string;
  horaFin: string;
  tipoRotacion: string;
};

export type SecuritySnapshot = {
  guardias: Guardia[];
  porterias: { id: number; nombre: string; tipo: string; ubicacion?: string; telefono?: string }[];
};

export const calendarCities = ["Quito", "Guayaquil", "Cuenca"];
export const weekDays = [
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
  "Domingo",
];
/**
 * Las cuatro franjas que ofrece el selector.
 *
 * Estaban escritas como texto --«06:00 a 12:00»--, y ese texto era lo que se
 * guardaba en el turno. De ahi venia que hubiera que volver a partirlo para
 * saber si alguien estaba trabajando. Ahora la franja **es** el par de horas y
 * la etiqueta se compone para el selector.
 */
export const FRANJAS_TURNO = [
  { horaInicio: "00:00", horaFin: "06:00" },
  { horaInicio: "06:00", horaFin: "12:00" },
  { horaInicio: "12:00", horaFin: "18:00" },
  { horaInicio: "18:00", horaFin: "24:00" },
] as const;

export const hourRanges = FRANJAS_TURNO.map((franja) =>
  formatRangoHoras(franja.horaInicio, franja.horaFin),
);

/**
 * Las horas que se pueden elegir, cada media hora.
 *
 * Los dos campos del horario recurrente --«Hora inicio» y «Hora fin»-- se
 * alimentaban de `hourRanges`, que son **rangos**: elegir «18:00 - 24:00» en un
 * campo que pide una hora guardaba ese texto como la hora de entrada. No se
 * notaba porque el horario recurrente no llegaba a guardarse en ningun sitio;
 * al conectarlo, esa cadena iba derecha a una columna `time`.
 *
 * Cada media hora y no cada franja de seis: una porteria con relevo a las 14:30
 * antes no podia expresarlo.
 */
export const HORAS_DEL_DIA = Array.from({ length: 49 }, (_, indice) => {
  const minutos = indice * 30;
  const hora = String(Math.floor(minutos / 60)).padStart(2, "0");
  return `${hora}:${String(minutos % 60).padStart(2, "0")}`;
});

/** La franja que corresponde a una etiqueta del selector. */
export function franjaDeEtiqueta(etiqueta: string) {
  return (
    FRANJAS_TURNO.find(
      (franja) =>
        formatRangoHoras(franja.horaInicio, franja.horaFin) === etiqueta,
    ) ?? null
  );
}
export const shifts = ["Mañana", "Tarde", "Noche"];
export const rotationTypes = ["semanal", "quincenal", "mensual"];
export const daysByIndex = ["Domingo", ...weekDays];

export function emptyGuardiaForm(garita = ""): GuardiaFormValues {
  return {
    nombre: "",
    correo: "",
    cedula: "",
    diasCalendario: "",
    turnos: [{ dia: "", horaInicio: "", horaFin: "" }],
    garita,
    permisoChat: true,
    permisoLlamadas: true,
  };
}

export function guardiaToForm(guardia: Guardia | null, defaultGarita = "") {
  if (!guardia) return emptyGuardiaForm(defaultGarita);
  return {
    ...guardia,
    turnos: guardia.turnos.length
      ? guardia.turnos.map((turno) => ({ ...turno }))
      : [{ dia: "", horaInicio: "", horaFin: "" }],
    permisoChat: guardia.permisoChat ?? true,
    permisoLlamadas: guardia.permisoLlamadas ?? true,
  };
}

export const emptyOverride: TurnoOverride = {
  fecha: "",
  horaInicio: "",
  horaFin: "",
};

export function cloneTurns(turnos: Turno[]) {
  return turnos.map((turno) => ({ ...turno }));
}
