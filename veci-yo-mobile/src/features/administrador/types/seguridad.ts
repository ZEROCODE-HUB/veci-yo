import type { Guardia, Turno, TurnoOverride } from "@/shared/types";

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
export const hourRanges = [
  "00:00 a 06:00",
  "06:00 a 12:00",
  "12:00 a 18:00",
  "18:00 a 24:00",
];
export const shifts = ["Mañana", "Tarde", "Noche"];
export const rotationTypes = ["semanal", "quincenal", "mensual"];
export const daysByIndex = ["Domingo", ...weekDays];

export function emptyGuardiaForm(garita = ""): GuardiaFormValues {
  return {
    nombre: "",
    correo: "",
    cedula: "",
    diasCalendario: "",
    turnos: [{ dia: "", hora: "" }],
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
      : [{ dia: "", hora: "" }],
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
