import { TIPO_LABELS } from '@/data';
import type { VisitaItem } from '@/shared/types';

export function parseVisitaDate(value?: string): Date | null {
  if (!value) return null;
  const parts = value.includes('/') ? value.split('/') : value.split('-');
  if (parts.length !== 3) return null;

  const [day, month, year] = value.includes('/')
    ? [Number(parts[0]), Number(parts[1]), Number(parts[2])]
    : [Number(parts[2]), Number(parts[1]), Number(parts[0])];
  const date = new Date(year, month - 1, day);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function toComparableDate(value?: string): string {
  const date = parseVisitaDate(value);
  if (!date) return '';
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}

export function isPastVisit(value?: string): boolean {
  const date = parseVisitaDate(value);
  if (!date) return false;
  date.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date.getTime() < today.getTime();
}

export function peopleWithHours(item: VisitaItem) {
  if (item.invitados?.length) {
    return item.invitados.filter((guest) => guest.horaIngreso || guest.horaSalida);
  }
  if (item.horaIngreso || item.horaSalida) {
    return [{ nombre: item.nombre, horaIngreso: item.horaIngreso, horaSalida: item.horaSalida }];
  }
  return [];
}

export function visitDateLabel(item: VisitaItem): string {
  const people = peopleWithHours(item);
  if (isPastVisit(item.fechaHasta || item.fechaDesde)) {
    const personWithEntry = people.find((person) => person.horaIngreso);
    if (personWithEntry?.horaIngreso) {
      return `Ingresó el ${item.fechaDesde || ''} a las ${personWithEntry.horaIngreso}`;
    }
    return `Visitó el ${item.fechaDesde || ''}`;
  }
  return `${item.fechaDesde || ''}${item.fechaHasta ? ` a ${item.fechaHasta}` : ''}`;
}

export function authorizationLabel(item: VisitaItem): string | null {
  if (item.autorizadoPor) {
    if (item.autorizadoPorRol === 'guardia') {
      return `Autorizado por guardia de seguridad ${item.autorizadoPor}`;
    }
    if (item.autorizadoPorRol === 'administrador') {
      return `Autorizado por administrador ${item.autorizadoPor}`;
    }
    return `Autorizado por ${item.autorizadoPor}`;
  }
  return item.registradoPor ? `Registrado por ${item.registradoPor}` : null;
}

export function visitTypeLabel(type: VisitaItem['tipo']): string {
  return TIPO_LABELS[type] || type;
}
