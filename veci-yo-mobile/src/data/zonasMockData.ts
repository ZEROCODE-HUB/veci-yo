import type { ReservaZona, ZonaComun } from '@/shared/types';

export const zonasComunes: ZonaComun[] = [
  { id: 'piscina', nombre: 'Piscina', emoji: '🏊', disponibles: 2, total: 2, usaSlots: false, duracionMaxima: 2, restringidaHuesped: true, reglamento: 'Horario de piscina: 08:00 a 20:00. Prohibido correr en el borde. Menores deben ir acompañados de un adulto.' },
  { id: 'parque', nombre: 'Parque', emoji: '🛝', disponibles: 15, total: 15, usaSlots: false, duracionMaxima: 3, restringidaHuesped: false, reglamento: 'Respetar el horario de silencio después de las 21:00. Recoger basura antes de retirarse.' },
  { id: 'bbq', nombre: 'BBQ', emoji: '🔥', disponibles: 15, total: 15, usaSlots: false, duracionMaxima: 4, restringidaHuesped: false, reglamento: 'Apagar parrilla tras usarla. No dejar carbón encendido. Limpiar la zona.' },
  { id: 'gym', nombre: 'GYM', emoji: '🏋️', disponibles: 30, total: 30, usaSlots: false, duracionMaxima: 2, restringidaHuesped: true, reglamento: 'Máximo 2 horas por reserva. Usar toalla en los equipos. Devolver pesas a su lugar.' },
  { id: 'coworking', nombre: 'Coworking', emoji: '💼', disponibles: 2, total: 2, usaSlots: false, duracionMaxima: 4, restringidaHuesped: false, reglamento: 'Mantener silencio. No consumir alimentos en las mesas de trabajo.' },
  { id: 'tenis', nombre: 'Tenis', emoji: '🎾', disponibles: 2, total: 2, usaSlots: true, duracionMaxima: 1, restringidaHuesped: true, reglamento: 'Una cancha por reserva. Calzado deportivo obligatorio.' },
  { id: 'sala-juegos', nombre: 'Sala de juegos', emoji: '🎱', disponibles: 5, total: 5, usaSlots: false, duracionMaxima: 3, restringidaHuesped: true, reglamento: 'No se permite el ingreso de menores sin supervisión.' },
  { id: 'lavanderia', nombre: 'Lavandería', emoji: '🫧', disponibles: 15, total: 15, usaSlots: true, duracionMaxima: 1, restringidaHuesped: false, reglamento: 'Slots de 1 hora. Retirar la ropa al finalizar el slot.' },
];

const people = (owner: string, count: number) => [
  { nombre: owner, llego: false, tipoParticipante: 'Residente' },
  ...Array.from({ length: count }, (_, index) => ({
    nombre: `Invitado ${index + 1}`,
    llego: false,
    tipoParticipante: 'Visitante',
  })),
];

export const reservasZona: ReservaZona[] = [
  { id: 1, zonaId: 'bbq', depto: 'Departamento 506 C', nombre: 'Carlos Balazo', acompanantes: 5, reservaNum: '245657', horario: 'Domingo 12 hs a 14 hs.', estado: 'Aprobado', personas: people('Carlos Balazo', 5) },
  { id: 2, zonaId: 'piscina', depto: 'Departamento 304 A', nombre: 'Ana Lopez', acompanantes: 4, reservaNum: '178452', horario: 'Sabado 09 hs a 11 hs.', estado: 'Aprobado', personas: people('Ana Lopez', 4) },
  { id: 3, zonaId: 'gym', depto: 'Departamento 405 A', nombre: 'Roberto Diaz', acompanantes: 1, reservaNum: '498321', horario: 'Martes 07 hs a 08 hs.', estado: 'Aprobado', personas: people('Roberto Diaz', 1) },
  { id: 4, zonaId: 'lavanderia', depto: 'Departamento 105', nombre: 'Guillermo Paredes', acompanantes: 0, reservaNum: '901207', horario: '10:00 - 11:00', estado: 'Aprobado', personas: people('Guillermo Paredes', 0), fecha: today(), esMia: true },
  { id: 5, zonaId: 'piscina', depto: 'Departamento 105', nombre: 'Guillermo Paredes', acompanantes: 2, reservaNum: '901208', horario: '16:00 - 18:00', estado: 'Pendiente', personas: people('Guillermo Paredes', 2), fecha: tomorrow(), esMia: true },
];

export const horasReserva = ['08:00 - 10:00', '10:00 - 12:00', '12:00 - 14:00', '14:00 - 16:00', '16:00 - 18:00', '18:00 - 20:00'];
export const cantidadPersonas = ['1 persona', '2 personas', '3 personas', '4 personas', '5 personas', '6 personas', '7 personas', '8 personas', '10 personas'];

const zonaConfigOverrides: Record<string, { horariosDisponibles: string[]; duracionPermitida: number; reglas: string; capacidadMaxima: number }> = {
  piscina: { horariosDisponibles: ['08:00 - 10:00', '10:00 - 12:00', '12:00 - 14:00', '14:00 - 16:00', '16:00 - 18:00'], duracionPermitida: 2, reglas: 'Maximo 10 personas. Menores deben estar acompanados por un adulto. No llevar vidrio.', capacidadMaxima: 10 },
  parque: { horariosDisponibles: ['08:00 - 12:00', '12:00 - 16:00', '16:00 - 20:00'], duracionPermitida: 4, reglas: 'Mantener limpio. No mascotas en area de juegos.', capacidadMaxima: 30 },
  bbq: { horariosDisponibles: ['10:00 - 12:00', '12:00 - 14:00', '14:00 - 16:00', '16:00 - 18:00', '18:00 - 20:00'], duracionPermitida: 2, reglas: 'Llevar sus propios utensilios. Dejar limpio. No musica alta.', capacidadMaxima: 15 },
  gym: { horariosDisponibles: ['06:00 - 08:00', '08:00 - 10:00', '10:00 - 12:00', '12:00 - 14:00', '14:00 - 16:00', '16:00 - 18:00', '18:00 - 20:00'], duracionPermitida: 2, reglas: 'Usar toalla. Limpiar maquinas despues de usar. No gritar.', capacidadMaxima: 15 },
  coworking: { horariosDisponibles: ['08:00 - 12:00', '12:00 - 16:00', '16:00 - 20:00'], duracionPermitida: 4, reglas: 'Silencio. No comida. Reservar con anticipacion.', capacidadMaxima: 6 },
  tenis: { horariosDisponibles: ['08:00 - 10:00', '10:00 - 12:00', '12:00 - 14:00', '14:00 - 16:00', '16:00 - 18:00'], duracionPermitida: 2, reglas: 'Usar calzado adecuado. Reservar con 24h de anticipacion.', capacidadMaxima: 4 },
  'sala-juegos': { horariosDisponibles: ['10:00 - 12:00', '12:00 - 14:00', '14:00 - 16:00', '16:00 - 18:00', '18:00 - 20:00'], duracionPermitida: 2, reglas: 'No comida. Cuidar implementos.', capacidadMaxima: 8 },
  lavanderia: { horariosDisponibles: ['08:00 - 12:00', '12:00 - 16:00', '16:00 - 20:00'], duracionPermitida: 4, reglas: 'No dejar ropa sin supervisar. Limpiar despues de usar.', capacidadMaxima: 4 },
};

export const zonasComunesConfigInit = Object.fromEntries(zonasComunes.map((zona) => [zona.id, {
  ...zonaConfigOverrides[zona.id],
  id: zona.id,
  nombre: zona.nombre,
  emoji: zona.emoji,
  descripcion: `${zona.nombre} comunitaria para residentes`,
  requiereAprobacion: false,
}])) as Record<string, { id: string; nombre: string; emoji: string; descripcion: string; horariosDisponibles: string[]; duracionPermitida: number; reglas: string; capacidadMaxima: number; requiereAprobacion: boolean }>;

function formatDate(date: Date) {
  return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
}
function today() { return formatDate(new Date()); }
function tomorrow() { const date = new Date(); date.setDate(date.getDate() + 1); return formatDate(date); }
