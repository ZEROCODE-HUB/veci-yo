import { TIPO_LABELS } from "@/data";
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
  if (estado === "Aceptado") return "#F5B800";
  if (estado === "Ingresado") return "#16A34A";
  if (estado === "Rechazado") return "#EF4444";
  return "#9CA3AF";
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
      return `Ingresó el ${item.fechaDesde || ""} a las ${personWithEntry.horaIngreso}`;
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

  if (dias > 0) return dias <= 3 ? "#EF4444" : "#2563EB";
  if (diasSalida < 0) return "#6B7280";
  return "#2563EB";
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
      color: dias <= 3 ? "#EF4444" : "#2563EB",
      background: dias <= 3 ? "#FEE2E2" : "#EFF6FF",
    };
  }

  if (dias === 0) {
    return {
      label: "Hoy es check-in",
      color: "#2563EB",
      background: "#EFF6FF",
    };
  }

  if (Number.isFinite(diasSalida) && diasSalida < 0) {
    const diasTranscurridos = Math.abs(diasSalida);
    return {
      label:
        diasTranscurridos === 1
          ? "El check-out se realizó hace 1 día"
          : `El check-out se realizó hace ${diasTranscurridos} días`,
      color: "#6B7280",
      background: "#F9FAFB",
    };
  }

  return {
    label: `Check-in fue hace ${Math.abs(dias)} días`,
    color: "#2563EB",
    background: "#EFF6FF",
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
