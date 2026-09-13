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
  { id: 2, zonaId: 'bbq', depto: 'Departamento 506 C', nombre: 'María García', acompanantes: 3, reservaNum: '245658', horario: 'Domingo 14 hs a 19:30 hs.', estado: 'Cancelado', personas: people('María García', 3) },
  { id: 3, zonaId: 'bbq', depto: 'Departamento 506 C', nombre: 'Juan Pérez', acompanantes: 2, reservaNum: '245659', horario: 'Domingo 14 hs a 19:30 hs.', estado: 'Pendiente', personas: people('Juan Pérez', 2) },
  { id: 4, zonaId: 'piscina', depto: 'Departamento 304 A', nombre: 'Ana López', acompanantes: 4, reservaNum: '178452', horario: 'Sábado 09 hs a 11 hs.', estado: 'Aprobado', personas: people('Ana López', 4) },
  { id: 5, zonaId: 'piscina', depto: 'Departamento 102 B', nombre: 'Pedro Martínez', acompanantes: 6, reservaNum: '178453', horario: 'Sábado 16 hs a 18 hs.', estado: 'Pendiente', personas: people('Pedro Martínez', 6) },
  { id: 6, zonaId: 'parque', depto: 'Departamento 201 C', nombre: 'Laura Sánchez', acompanantes: 8, reservaNum: '356214', horario: 'Lunes 16 hs a 17 hs.', estado: 'Aprobado', personas: people('Laura Sánchez', 8) },
  { id: 7, zonaId: 'gym', depto: 'Departamento 405 A', nombre: 'Roberto Díaz', acompanantes: 1, reservaNum: '498321', horario: 'Martes 07 hs a 08 hs.', estado: 'Aprobado', personas: people('Roberto Díaz', 1) },
  { id: 8, zonaId: 'gym', depto: 'Departamento 110 B', nombre: 'Carmen Ruiz', acompanantes: 0, reservaNum: '498322', horario: 'Miércoles 18 hs a 19 hs.', estado: 'Cancelado', personas: people('Carmen Ruiz', 0) },
  { id: 9, zonaId: 'coworking', depto: 'Departamento 506 C', nombre: 'Carlos Balazo', acompanantes: 2, reservaNum: '512873', horario: 'Jueves 09 hs a 13 hs.', estado: 'Aprobado', personas: people('Carlos Balazo', 2) },
  { id: 10, zonaId: 'tenis', depto: 'Departamento 304 A', nombre: 'Miguel Torres', acompanantes: 3, reservaNum: '624190', horario: 'Viernes 17 hs a 18 hs.', estado: 'Pendiente', personas: people('Miguel Torres', 3) },
  { id: 11, zonaId: 'sala-juegos', depto: 'Departamento 201 C', nombre: 'Sofía Herrera', acompanantes: 4, reservaNum: '731065', horario: 'Sábado 15 hs a 17 hs.', estado: 'Aprobado', personas: people('Sofía Herrera', 4) },
  { id: 12, zonaId: 'lavanderia', depto: 'Departamento 102 B', nombre: 'Diego Castro', acompanantes: 0, reservaNum: '845972', horario: 'Domingo 10 hs a 11 hs.', estado: 'Cancelado', personas: people('Diego Castro', 0) },
  { id: 13, zonaId: 'sala-juegos', depto: 'Departamento 304 A', nombre: 'Valentina Ríos', acompanantes: 5, reservaNum: '845973', horario: 'Sabado 16 hs a 18 hs.', estado: 'Pendiente', personas: people('Valentina Ríos', 5) },
  { id: 14, zonaId: 'coworking', depto: 'Departamento 506 C', nombre: 'Andrés Vega', acompanantes: 1, reservaNum: '845974', horario: 'Lunes 10 hs a 12 hs.', estado: 'Cancelado', personas: people('Andrés Vega', 1) },
  { id: 15, zonaId: 'piscina', depto: 'Departamento 201 C', nombre: 'Laura Sánchez', acompanantes: 3, reservaNum: '901200', horario: '10:00 - 12:00', estado: 'Aprobado', personas: people('Laura Sánchez', 3) },
  { id: 16, zonaId: 'piscina', depto: 'Departamento 405 A', nombre: 'Roberto Díaz', acompanantes: 2, reservaNum: '901201', horario: '14:00 - 16:00', estado: 'Aprobado', personas: people('Roberto Díaz', 2) },
  { id: 17, zonaId: 'bbq', depto: 'Departamento 304 A', nombre: 'Miguel Torres', acompanantes: 6, reservaNum: '901202', horario: '12:00 - 14:00', estado: 'Aprobado', personas: people('Miguel Torres', 6) },
  { id: 18, zonaId: 'bbq', depto: 'Departamento 102 B', nombre: 'Carmen Ruiz', acompanantes: 4, reservaNum: '901203', horario: '16:00 - 18:00', estado: 'Pendiente', personas: people('Carmen Ruiz', 4) },
  { id: 19, zonaId: 'gym', depto: 'Departamento 506 C', nombre: 'Carlos Balazo', acompanantes: 1, reservaNum: '901204', horario: '08:00 - 10:00', estado: 'Aprobado', personas: people('Carlos Balazo', 1) },
  { id: 20, zonaId: 'coworking', depto: 'Departamento 201 C', nombre: 'Sofía Herrera', acompanantes: 1, reservaNum: '901205', horario: '10:00 - 12:00', estado: 'Aprobado', personas: people('Sofía Herrera', 1) },
  { id: 21, zonaId: 'parque', depto: 'Departamento 304 A', nombre: 'Valentina Ríos', acompanantes: 5, reservaNum: '901206', horario: '16:00 - 18:00', estado: 'Aprobado', personas: people('Valentina Ríos', 5) },
  { id: 22, zonaId: 'lavanderia', depto: 'Departamento 105', nombre: 'Guillermo Paredes', acompanantes: 0, reservaNum: '901207', horario: '10:00 - 11:00', estado: 'Aprobado', personas: people('Guillermo Paredes', 0), fecha: today(), esMia: true },
  { id: 23, zonaId: 'piscina', depto: 'Departamento 105', nombre: 'Guillermo Paredes', acompanantes: 2, reservaNum: '901208', horario: '16:00 - 18:00', estado: 'Pendiente', personas: people('Guillermo Paredes', 2), fecha: tomorrow(), esMia: true },
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

const zonaDescripciones: Record<string, string> = {
  piscina: 'Piscina comunitaria para residentes',
  parque: 'Parque infantil y area verde',
  bbq: 'Area de parrillas para reuniones',
  gym: 'Gimnasio equipado con maquinas modernas',
  coworking: 'Espacio de trabajo compartido',
  tenis: 'Cancha de tenis',
  'sala-juegos': 'Sala de juegos con billar y ping pong',
  lavanderia: 'Lavanderia comunitaria',
};

export const zonasComunesConfigInit = Object.fromEntries(zonasComunes.map((zona) => [zona.id, {
  ...zonaConfigOverrides[zona.id],
  id: zona.id,
  nombre: zona.nombre,
  emoji: zona.emoji,
  descripcion: zonaDescripciones[zona.id] || '',
  requiereAprobacion: false,
}])) as Record<string, { id: string; nombre: string; emoji: string; descripcion: string; horariosDisponibles: string[]; duracionPermitida: number; reglas: string; capacidadMaxima: number; requiereAprobacion: boolean }>;

function formatDate(date: Date) {
  return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
}
function today() { return formatDate(new Date()); }
function tomorrow() { const date = new Date(); date.setDate(date.getDate() + 1); return formatDate(date); }
