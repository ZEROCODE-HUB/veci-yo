import { theme } from "@/config";
import { TIPO_LABELS } from "../constants";
import type { VisitaItem } from "@/shared/types";

export function parseVisitaDate(value?: string): Date | null {
  if (!value) return null;
  const parts = value.includes("/") ? value.split("/") : value.split("-");
  if (parts.length !== 3) return null;

  const [day, month, year] = value.includes("/")
    ? [Number(parts[0]), Number(parts[1]), Number(parts[2])]
    : [Number(parts[2]), Number(parts[1]), Number(parts[0])];
  const date = new Date(year, month - 1, day);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function toComparableDate(value?: string): string {
  const date = parseVisitaDate(value);
  if (!date) return "";
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

export function isPastVisit(value?: string): boolean {
  const date = parseVisitaDate(value);
  if (!date) return false;
  date.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date.getTime() < today.getTime();
}

export interface PersonaVisita {
  nombre: string;
  ci?: string;
  esTitular: boolean;
  idx: number;
  horaIngreso?: string;
  horaSalida?: string;
}

export function obtenerPersonasDeVisita(item: VisitaItem): PersonaVisita[] {
  const titular: PersonaVisita = {
    nombre: item.nombre,
    ci: item.ci,
    esTitular: true,
    idx: -1,
    horaIngreso: item.horaIngreso,
    horaSalida: item.horaSalida,
  };

  if (!item.invitados?.length) return [titular];

  return [
    titular,
    ...item.invitados.map((invitado, idx) => ({
      ...invitado,
      esTitular: false,
      idx,
    })),
  ];
}

export function fechaComparable(value?: string): string {
  return toComparableDate(value);
}

export function colorEstadoVisita(estado?: string): string {
  if (estado === "Aceptado") return theme.colors.primary;
  if (estado === "Ingresado") return theme.colors.success;
  if (estado === "Rechazado") return theme.colors.danger;
  return theme.colors.textMuted;
}

export function peopleWithHours(item: VisitaItem) {
  if (item.invitados?.length) {
    return item.invitados.filter(
      (guest) => guest.horaIngreso || guest.horaSalida,
    );
  }
  if (item.horaIngreso || item.horaSalida) {
    return [
      {
        nombre: item.nombre,
        horaIngreso: item.horaIngreso,
        horaSalida: item.horaSalida,
        fechaIngreso: item.fechaIngreso,
        fechaSalida: item.fechaSalida,
      },
    ];
  }
  return [];
}

export function visitDateLabel(item: VisitaItem): string {
  const people = peopleWithHours(item);
  if (isPastVisit(item.fechaHasta || item.fechaDesde)) {
    const personWithEntry = people.find((person) => person.horaIngreso);
    if (personWithEntry?.horaIngreso) {
      /*
        El día lo pone la entrada, no la visita: se leía la fecha **prevista**
        con la hora **real**, así que una visita del 22 a la que alguien entra
        el 28 decía «Ingresó el 22 a las 16:07». `fechaDesde` queda de respaldo
        para lo anterior a que se guardara la marca.
      */
      const dia = personWithEntry.fechaIngreso || item.fechaDesde || "";
      return `Ingresó el ${dia} a las ${personWithEntry.horaIngreso}`;
    }
    return `Visitó el ${item.fechaDesde || ""}`;
  }
  return `${item.fechaDesde || ""}${item.fechaHasta ? ` a ${item.fechaHasta}` : ""}`;
}

export function authorizationLabel(item: VisitaItem): string | null {
  if (item.autorizadoPor) {
    if (item.autorizadoPorRol === "guardia") {
      return `Autorizado por guardia de seguridad ${item.autorizadoPor}`;
    }
    if (item.autorizadoPorRol === "administrador") {
      return `Autorizado por administrador ${item.autorizadoPor}`;
    }
    return `Autorizado por ${item.autorizadoPor}`;
  }
  return item.registradoPor ? `Registrado por ${item.registradoPor}` : null;
}

export function visitTypeLabel(type: VisitaItem["tipo"]): string {
  return TIPO_LABELS[type] || type;
}

export function formatearRangoHorario(start: string, end: string): string {
  if (!start && !end) return "";
  if (start && !end) return start;
  if (!start && end) return end;
  return `${start} – ${end}`;
}

export interface EstadoCheckin {
  label: string;
  color: string;
  background: string;
}

export function diasHasta(value?: string): number {
  const date = parseVisitaDate(value);
  if (!date) return 999;

  date.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return Math.ceil(
    (date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  );
}

export function obtenerColorReserva(
  fechaDesde?: string,
  fechaHasta?: string,
): string {
  const dias = diasHasta(fechaDesde);
  const diasSalida = fechaHasta ? diasHasta(fechaHasta) : Infinity;

  if (dias > 0) return dias <= 3 ? theme.colors.danger : theme.colors.secondary;
  if (diasSalida < 0) return theme.colors.textSecondary;
  return theme.colors.secondary;
}

export function obtenerEstadoCheckin(
  fechaDesde?: string,
  fechaHasta?: string,
): EstadoCheckin | null {
  if (!fechaDesde) return null;

  const dias = diasHasta(fechaDesde);
  const diasSalida = fechaHasta ? diasHasta(fechaHasta) : Infinity;

  if (dias > 0) {
    return {
      label: dias === 1 ? "Check-in mañana" : `Faltan ${dias} días para check-in`,
      color: dias <= 3 ? theme.colors.danger : theme.colors.secondary,
      background: dias <= 3 ? theme.colors.dangerLight : theme.colors.secondaryLight,
    };
  }

  if (dias === 0) {
    return {
      label: "Hoy es check-in",
      color: theme.colors.secondary,
      background: theme.colors.secondaryLight,
    };
  }

  if (Number.isFinite(diasSalida) && diasSalida < 0) {
    const diasTranscurridos = Math.abs(diasSalida);
    return {
      label:
        diasTranscurridos === 1
          ? "El check-out se realizó hace 1 día"
          : `El check-out se realizó hace ${diasTranscurridos} días`,
      color: theme.colors.textSecondary,
      background: theme.colors.bgMuted,
    };
  }

  return {
    label: `Check-in fue hace ${Math.abs(dias)} días`,
    color: theme.colors.secondary,
    background: theme.colors.secondaryLight,
  };
}

export function normalizarTimelineInvitados(item: VisitaItem) {
  return item.invitados.map((guest) => ({
    ...guest,
    timeline: guest.timeline
      ? (Object.fromEntries(
          Object.entries(guest.timeline).filter(([, value]) => value !== null),
        ) as Record<string, string | boolean>)
      : undefined,
  }));
}
