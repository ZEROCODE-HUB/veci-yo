// ─── CORRESPONDENCIA ────────────────────────────────────────────────────────

export const correspondenciaItems = [
  {
    id: 1,
    empresa: 'Rappi',
    unidad: '504 C',
    nombre: 'Ana Flores',
    ci: '1782753581',
    estado: 'Entregado',
    fecha: '15/05/2024',
    categoria: 'Delivery',
    logistica: 'Rappi',
    descripcion: 'Sobre pequeño',
    entregaEnPuerta: false,
    torre: 'Torre 1',
    piso: '5',
    estadoEncomienda: 'Buen estado',
  },
  {
    id: 2,
    empresa: 'Rappi',
    unidad: '504 C',
    nombre: 'Ana Flores',
    ci: '1782753581',
    estado: 'En Portería',
    fecha: '15/05/2024',
    categoria: 'Delivery',
    logistica: 'Rappi',
    descripcion: 'Caja mediana',
    entregaEnPuerta: true,
    torre: 'Torre 1',
    piso: '5',
    estadoEncomienda: 'Buen estado',
  },
  {
    id: 3,
    empresa: 'Expreso el pajaro',
    unidad: '504 C',
    nombre: 'Anuel Flores',
    ci: '1785643581',
    estado: 'No Recibido',
    fecha: '15/05/2024',
    categoria: 'Compra',
    logistica: 'Expreso el pájaro',
    descripcion: 'Paquete grande',
    entregaEnPuerta: false,
    torre: 'Torre 1',
    piso: '5',
    estadoEncomienda: 'Estado intermedio',
  },
  {
    id: 4,
    empresa: 'Rappi',
    unidad: '504 C',
    nombre: 'Ana Flores',
    ci: '1782753581',
    estado: 'Entregado',
    fecha: '14/05/2024',
    categoria: 'Delivery',
    logistica: 'Rappi',
    descripcion: '',
    entregaEnPuerta: false,
    torre: 'Torre 1',
    piso: '5',
    estadoEncomienda: 'Buen estado',
  },
  {
    id: 5,
    empresa: 'DHL',
    unidad: '302 A',
    nombre: 'Carlos Méndez',
    ci: '1791234567',
    estado: 'En Portería',
    fecha: '13/05/2024',
    categoria: 'Compra',
    logistica: 'DHL',
    descripcion: 'Electrónico frágil',
    entregaEnPuerta: false,
    torre: 'Torre 2',
    piso: '3',
    estadoEncomienda: 'Buen estado',
    informarInfo: {
      descripcion: 'El paquete llegó con la caja ligeramente abollada en una esquina. Se notificó al destinatario.',
      fotos: [],
      fechaReporte: '13/05/2024 14:32',
      usuarioReporte: 'Roberto Hornado',
    },
  },
];

export const categorias = ['Delivery', 'Sobres', 'Paquetería'];
export const logisticas = ['Rappi', 'DHL', 'Fedex', 'Expreso el pájaro', 'Otro'];
export const estadosEncomienda = ['Buen estado', 'Estado intermedio', 'Mal estado'];
export const torres = ['Torre 1', 'Torre 2', 'Torre 3'];
export const pisos = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];

// ─── VISITAS ─────────────────────────────────────────────────────────────────

export const tiposVisita = [
  { id: 'amigos', label: 'Amigos Familiares', emoji: '🏠', color: '#F59E0B' },
  { id: 'temporal', label: 'Profesional Temporal', emoji: '👷', color: '#F59E0B' },
  { id: 'permanente', label: 'Profesional Permanente', emoji: '👩‍⚕️', color: '#F59E0B' },
];

export const visitasItems = [
  {
    id: 1,
    tipo: 'amigos',
    nombre: 'Guillermo Sarpeito',
    ci: '1782753580',
    estado: 'Aceptado',
    fechaDesde: '01/12/2025',
    fechaHasta: '15/01/2026',
    esEvento: false,
    invitados: [
      { nombre: 'Marilu Esterla', llego: false, aprobado: 'pendiente', documentos: [], esMenor: false },
      { nombre: 'Mario Bonefi', llego: false, aprobado: 'pendiente', documentos: [], esMenor: false },
      { nombre: 'guilermo star', llego: false, aprobado: 'aprobado', documentos: [], esMenor: false },
    ],
    qrUrl: 'wwww.veciyolink/2342342.com',
    reserva: 'N°: 656587',
    torre: 'Torre 1',
    depto: '105',
    personas: 3,
  },
  {
    id: 2,
    tipo: 'amigos',
    nombre: 'Guillermina Sarpeito',
    ci: '1782753580',
    estado: 'Aceptado',
    esMenor: true,
    tieneTutela: true,
    fechaDesde: '01/12/2025',
    fechaHasta: '15/01/2026',
    esEvento: true,
    nombreEvento: 'Evento: Guillermina Sarpeito',
    invitados: [
      { nombre: 'guilermo star', llego: false, aprobado: 'aprobado', documentos: [], esMenor: false },
      { nombre: 'guilermo star', llego: false, aprobado: 'pendiente', documentos: [], esMenor: false },
      { nombre: 'guilermo star', llego: false, aprobado: 'rechazado', documentos: [], esMenor: false },
    ],
    qrUrl: 'wwww.veciyolink/2342342.com',
    reserva: 'N°: 656588',
    torre: 'Torre 1',
    depto: '105',
    personas: 5,
  },
  {
    id: 3,
    tipo: 'permanente',
    nombre: 'Jorge Sarpeito',
    ci: '1782753580',
    estado: 'Aceptado',
    fechaDesde: '01/12/2025',
    fechaHasta: '15/01/2026',
    esEvento: false,
    invitados: [],
    qrUrl: 'wwww.veciyolink/2342342.com',
    reserva: 'N°: 656589',
    torre: 'Torre 1',
    depto: '105',
    personas: 1,
  },
  {
    id: 4,
    tipo: 'temporal',
    nombre: 'Gogo Sarpeito',
    ci: '1782753580',
    estado: 'Rechazado',
    fechaDesde: '22/10/2024',
    fechaHasta: '22/10/2024',
    esEvento: false,
    invitados: [],
    qrUrl: 'wwww.veciyolink/2342342.com',
    reserva: 'N°: 656587',
    torre: 'Torre 1',
    depto: '105',
    personas: 1,
  },
  {
    id: 5,
    tipo: 'amigos',
    nombre: 'Mariana López',
    ci: '1791234560',
    estado: 'Pendiente',
    fechaDesde: '10/06/2025',
    fechaHasta: '10/06/2025',
    esEvento: false,
    invitados: [],
    qrUrl: 'wwww.veciyolink/2342343.com',
    reserva: 'N°: 656590',
    torre: 'Torre 1',
    depto: '201',
    personas: 2,
  },
  {
    id: 6,
    tipo: 'huesped-temporal',
    nombre: 'María Fernanda López',
    ci: '1723456789',
    estado: 'Aceptado',
    fechaDesde: '15/07/2026',
    fechaHasta: '20/07/2026',
    esEvento: false,
    invitados: [
      { nombre: 'Carlos Mendoza', llego: true, aprobado: 'aprobado', esMenor: false, documentos: ['cedula-anverso', 'cedula-reverso', 'pasaporte'] },
      { nombre: 'Lucía Torres', llego: false, aprobado: 'pendiente', esMenor: false, documentos: ['cedula-anverso'] },
      { nombre: 'Pedro Ramírez', llego: false, aprobado: 'rechazado', esMenor: false, documentos: ['cedula-anverso', 'cedula-reverso'] },
    ],
    qrUrl: 'wwww.veciyolink/reserva-656591',
    reserva: 'N°: 656591',
    torre: 'Torre 1',
    depto: '105',
    personas: 3,
  },
  {
    id: 7,
    tipo: 'huesped-temporal',
    nombre: 'Roberto Andrade',
    ci: '1712345678',
    estado: 'Pendiente',
    fechaDesde: '22/07/2026',
    fechaHasta: '28/07/2026',
    esEvento: false,
    invitados: [
      { nombre: 'Ana María Silva', llego: false, aprobado: 'pendiente', esMenor: false, documentos: ['cedula-anverso', 'cedula-reverso'] },
      { nombre: 'Luis Fernando Soto', llego: false, aprobado: 'pendiente', esMenor: false, documentos: ['pasaporte'] },
    ],
    qrUrl: 'wwww.veciyolink/reserva-656592',
    reserva: 'N°: 656592',
    torre: 'Torre 2',
    depto: '201',
    personas: 2,
  },
  {
    id: 8,
    tipo: 'huesped-temporal',
    nombre: 'Carmen Villalobos',
    ci: '175556667',
    estado: 'Pendiente',
    fechaDesde: '01/08/2026',
    fechaHasta: '10/08/2026',
    esEvento: false,
    invitados: [
      { nombre: 'Diego Villalobos', llego: false, aprobado: 'pendiente', esMenor: true, documentos: ['cedula-anverso', 'tutela'], tieneTutela: true },
      { nombre: 'Sofía Villalobos', llego: false, aprobado: 'pendiente', esMenor: true, documentos: [], tieneTutela: false },
      { nombre: 'Miguel Torres', llego: false, aprobado: 'pendiente', esMenor: false, documentos: ['cedula-anverso', 'cedula-reverso'] },
    ],
    qrUrl: 'wwww.veciyolink/reserva-656593',
    reserva: 'N°: 656593',
    torre: 'Torre 1',
    depto: '301',
    personas: 3,
  },
  {
    id: 9,
    tipo: 'huesped-temporal',
    nombre: 'Patricio Estrella',
    ci: '178889990',
    estado: 'Rechazado',
    fechaDesde: '05/06/2026',
    fechaHasta: '07/06/2026',
    esEvento: false,
    invitados: [
      { nombre: 'Bob Esponja', llego: false, aprobado: 'rechazado', esMenor: false, documentos: ['cedula-anverso'] },
    ],
    qrUrl: 'wwww.veciyolink/reserva-656594',
    reserva: 'N°: 656594',
    torre: 'Torre 3',
    depto: '101',
    personas: 1,
  },
];

export const packVerificacion = [
  { id: 1, label: 'Pack de 10 verificaciones', precio: '$10' },
  { id: 2, label: 'Pack de 15 verificaciones', precio: '$15' },
  { id: 3, label: 'Pack de 20 verificaciones', precio: '$20' },
];

// ─── ZONAS COMUNES ───────────────────────────────────────────────────────────

export const zonasComunes = [
  { id: 'piscina', nombre: 'Piscina', emoji: '🏊', disponibles: 2, total: 2 },
  { id: 'parque', nombre: 'Parque', emoji: '🛝', disponibles: 15, total: 15 },
  { id: 'bbq', nombre: 'BBQ', emoji: '🔥', disponibles: 15, total: 15 },
  { id: 'gym', nombre: 'GYM', emoji: '🏋️', disponibles: 30, total: 30 },
  { id: 'coworking', nombre: 'Coworking', emoji: '💼', disponibles: 2, total: 2 },
  { id: 'tenis', nombre: 'Tenis', emoji: '🎾', disponibles: 2, total: 2 },
  { id: 'sala-juegos', nombre: 'Sala de juegos', emoji: '🎱', disponibles: 5, total: 5 },
  { id: 'lavanderia', nombre: 'Lavandería', emoji: '🫧', disponibles: 15, total: 15 },
];

function generarPersonas(titular, cantidad) {
  const nombres = ['Luis', 'Ana', 'Pedro', 'María', 'Carlos', 'Sofía', 'Diego', 'Valentina', 'Miguel', 'Laura', 'Andrés', 'Carmen', 'Roberto', 'Ana', 'Jorge', 'Elena'];
  const personas = [{ nombre: titular, llego: false }];
  for (let i = 0; i < cantidad && i < nombres.length; i++) {
    personas.push({ nombre: `${nombres[i]} ${['García', 'López', 'Martínez', 'Pérez', 'Rodríguez', 'Sánchez'][i % 6]}`, llego: false });
  }
  return personas;
}

export const reservasZona = [
  {
    id: 1, zonaId: 'bbq', depto: 'Departamento 506 C', nombre: 'Carlos Balazo', acompanantes: 5,
    reservaNum: '245657', horario: 'Domingo 12 hs a 14 hs.', estado: 'Aprobado',
    personas: generarPersonas('Carlos Balazo', 5),
  },
  {
    id: 2, zonaId: 'bbq', depto: 'Departamento 506 C', nombre: 'María García', acompanantes: 3,
    reservaNum: '245658', horario: 'Domingo 14 hs a 19:30 hs.', estado: 'Cancelado',
    personas: generarPersonas('María García', 3),
  },
  {
    id: 3, zonaId: 'bbq', depto: 'Departamento 506 C', nombre: 'Juan Pérez', acompanantes: 2,
    reservaNum: '245659', horario: 'Domingo 14 hs a 19:30 hs.', estado: 'Pendiente',
    personas: generarPersonas('Juan Pérez', 2),
  },
  {
    id: 4, zonaId: 'piscina', depto: 'Departamento 304 A', nombre: 'Ana López', acompanantes: 4,
    reservaNum: '178452', horario: 'Sábado 09 hs a 11 hs.', estado: 'Aprobado',
    personas: generarPersonas('Ana López', 4),
  },
  {
    id: 5, zonaId: 'piscina', depto: 'Departamento 102 B', nombre: 'Pedro Martínez', acompanantes: 6,
    reservaNum: '178453', horario: 'Sábado 16 hs a 18 hs.', estado: 'Pendiente',
    personas: generarPersonas('Pedro Martínez', 6),
  },
  {
    id: 6, zonaId: 'parque', depto: 'Departamento 201 C', nombre: 'Laura Sánchez', acompanantes: 8,
    reservaNum: '356214', horario: 'Lunes 16 hs a 17 hs.', estado: 'Aprobado',
    personas: generarPersonas('Laura Sánchez', 8),
  },
  {
    id: 7, zonaId: 'gym', depto: 'Departamento 405 A', nombre: 'Roberto Díaz', acompanantes: 1,
    reservaNum: '498321', horario: 'Martes 07 hs a 08 hs.', estado: 'Aprobado',
    personas: generarPersonas('Roberto Díaz', 1),
  },
  {
    id: 8, zonaId: 'gym', depto: 'Departamento 110 B', nombre: 'Carmen Ruiz', acompanantes: 0,
    reservaNum: '498322', horario: 'Miércoles 18 hs a 19 hs.', estado: 'Cancelado',
    personas: generarPersonas('Carmen Ruiz', 0),
  },
  {
    id: 9, zonaId: 'coworking', depto: 'Departamento 506 C', nombre: 'Carlos Balazo', acompanantes: 2,
    reservaNum: '512873', horario: 'Jueves 09 hs a 13 hs.', estado: 'Aprobado',
    personas: generarPersonas('Carlos Balazo', 2),
  },
  {
    id: 10, zonaId: 'tenis', depto: 'Departamento 304 A', nombre: 'Miguel Torres', acompanantes: 3,
    reservaNum: '624190', horario: 'Viernes 17 hs a 18 hs.', estado: 'Pendiente',
    personas: generarPersonas('Miguel Torres', 3),
  },
  {
    id: 11, zonaId: 'sala-juegos', depto: 'Departamento 201 C', nombre: 'Sofía Herrera', acompanantes: 4,
    reservaNum: '731065', horario: 'Sábado 15 hs a 17 hs.', estado: 'Aprobado',
    personas: generarPersonas('Sofía Herrera', 4),
  },
  {
    id: 12, zonaId: 'lavanderia', depto: 'Departamento 102 B', nombre: 'Diego Castro', acompanantes: 0,
    reservaNum: '845972', horario: 'Domingo 10 hs a 11 hs.', estado: 'Cancelado',
    personas: generarPersonas('Diego Castro', 0),
  },
  {
    id: 13, zonaId: 'sala-juegos', depto: 'Departamento 304 A', nombre: 'Valentina Ríos', acompanantes: 5,
    reservaNum: '845973', horario: 'Sabado 16 hs a 18 hs.', estado: 'Pendiente',
    personas: generarPersonas('Valentina Ríos', 5),
  },
  {
    id: 14, zonaId: 'coworking', depto: 'Departamento 506 C', nombre: 'Andrés Vega', acompanantes: 1,
    reservaNum: '845974', horario: 'Lunes 10 hs a 12 hs.', estado: 'Cancelado',
    personas: generarPersonas('Andrés Vega', 1),
  },
];

export const horasReserva = [
  '08:00 - 10:00',
  '10:00 - 12:00',
  '12:00 - 14:00',
  '14:00 - 16:00',
  '16:00 - 18:00',
  '18:00 - 20:00',
];

export const cantidadPersonas = ['1 persona', '2 personas', '3 personas', '4 personas', '5 personas', '6 personas', '7 personas', '8 personas', '10 personas'];

export const zonasComunesConfigInit = {
  piscina: {
    id: 'piscina', nombre: 'Piscina', emoji: '🏊',
    descripcion: 'Piscina comunitaria para residentes',
    horariosDisponibles: ['08:00 - 10:00', '10:00 - 12:00', '12:00 - 14:00', '14:00 - 16:00', '16:00 - 18:00'],
    duracionPermitida: 2,
    reglas: 'Maximo 10 personas. Menores deben estar acompanados por un adulto. No llevar vidrio.',
    capacidadMaxima: 10,
    requiereAprobacion: false,
  },
  parque: {
    id: 'parque', nombre: 'Parque', emoji: '🛝',
    descripcion: 'Parque infantil y area verde',
    horariosDisponibles: ['08:00 - 12:00', '12:00 - 16:00', '16:00 - 20:00'],
    duracionPermitida: 4,
    reglas: 'Mantener limpio. No mascotas en area de juegos.',
    capacidadMaxima: 30,
    requiereAprobacion: false,
  },
  bbq: {
    id: 'bbq', nombre: 'BBQ', emoji: '🔥',
    descripcion: 'Area de parrillas para reuniones',
    horariosDisponibles: ['10:00 - 12:00', '12:00 - 14:00', '14:00 - 16:00', '16:00 - 18:00', '18:00 - 20:00'],
    duracionPermitida: 2,
    reglas: 'Llevar sus propios utensilios. Dejar limpio. No musica alta.',
    capacidadMaxima: 15,
    requiereAprobacion: false,
  },
  gym: {
    id: 'gym', nombre: 'GYM', emoji: '🏋️',
    descripcion: 'Gimnasio equipado con maquinas modernas',
    horariosDisponibles: ['06:00 - 08:00', '08:00 - 10:00', '10:00 - 12:00', '12:00 - 14:00', '14:00 - 16:00', '16:00 - 18:00', '18:00 - 20:00'],
    duracionPermitida: 2,
    reglas: 'Usar toalla. Limpiar maquinas despues de usar. No gritar.',
    capacidadMaxima: 15,
    requiereAprobacion: false,
  },
  coworking: {
    id: 'coworking', nombre: 'Coworking', emoji: '💼',
    descripcion: 'Espacio de trabajo compartido',
    horariosDisponibles: ['08:00 - 12:00', '12:00 - 16:00', '16:00 - 20:00'],
    duracionPermitida: 4,
    reglas: 'Silencio. No comida. Reservar con anticipacion.',
    capacidadMaxima: 6,
    requiereAprobacion: false,
  },
  tenis: {
    id: 'tenis', nombre: 'Tenis', emoji: '🎾',
    descripcion: 'Cancha de tenis',
    horariosDisponibles: ['08:00 - 10:00', '10:00 - 12:00', '12:00 - 14:00', '14:00 - 16:00', '16:00 - 18:00'],
    duracionPermitida: 2,
    reglas: 'Usar calzado adecuado. Reservar con 24h de anticipacion.',
    capacidadMaxima: 4,
    requiereAprobacion: false,
  },
  'sala-juegos': {
    id: 'sala-juegos', nombre: 'Sala de juegos', emoji: '🎱',
    descripcion: 'Sala de juegos con billar y ping pong',
    horariosDisponibles: ['10:00 - 12:00', '12:00 - 14:00', '14:00 - 16:00', '16:00 - 18:00', '18:00 - 20:00'],
    duracionPermitida: 2,
    reglas: 'No comida. Cuidar implementos.',
    capacidadMaxima: 8,
    requiereAprobacion: false,
  },
  lavanderia: {
    id: 'lavanderia', nombre: 'Lavandería', emoji: '🫧',
    descripcion: 'Lavanderia comunitaria',
    horariosDisponibles: ['08:00 - 12:00', '12:00 - 16:00', '16:00 - 20:00'],
    duracionPermitida: 4,
    reglas: 'No dejar ropa sin supervisar. Limpiar despues de usar.',
    capacidadMaxima: 4,
    requiereAprobacion: false,
  },
};

// ─── GESTIÓN DE ZONAS COMUNES (ADMIN) ─────────────────────────────────────────

const DIAS_SEMANA = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

export const tiposZona = [
  'Barbecue', 'Swimming Pool', 'Children\'s Park', 'Gym',
  'Coworking Space', 'Tennis Court', 'Game Room', 'Laundry Room',
];

const TIPO_MAP = {
  bbq: 'Barbecue', piscina: 'Swimming Pool', parque: 'Children\'s Park',
  gym: 'Gym', coworking: 'Coworking Space', tenis: 'Tennis Court',
  'sala-juegos': 'Game Room', lavanderia: 'Laundry Room',
};

function buildGestionZona(id, nombre, extra = {}) {
  return {
    id,
    nombre,
    tipo: TIPO_MAP[id] || 'Otra',
    descripcion: '',
    imagen: null,
    horarioApertura: '08:00',
    horarioCierre: '22:00',
    duracionMinima: 60,
    duracionMaxima: 240,
    tiempoMinimoEntreReservas: 30,
    diasHabilitados: [...DIAS_SEMANA],
    fechasEspeciales: [],
    montoGarantia: 0,
    costoLimpieza: 0,
    costoReserva: 0,
    moneda: 'COP',
    activa: true,
    ...extra,
  };
}

export const gestionZonasInit = {
  piscina: buildGestionZona('piscina', 'Piscina', {
    descripcion: 'Piscina comunitaria para residentes',
    horarioApertura: '06:00', horarioCierre: '21:00',
    duracionMinima: 60, duracionMaxima: 180,
    costoReserva: 0,
    fechasEspeciales: [
      { fecha: '2026-12-25', tipo: 'cerrado', motivo: 'Navidad' },
      { fecha: '2026-01-01', tipo: 'cerrado', motivo: 'Año Nuevo' },
    ],
  }),
  parque: buildGestionZona('parque', 'Parque', {
    descripcion: 'Parque infantil y área verde',
    horarioApertura: '07:00', horarioCierre: '20:00',
    duracionMaxima: 480,
  }),
  bbq: buildGestionZona('bbq', 'BBQ', {
    descripcion: 'Área de parrillas para reuniones familiares',
    montoGarantia: 50000, costoLimpieza: 15000,
    duracionMaxima: 240, tiempoMinimoEntreReservas: 60,
  }),
  gym: buildGestionZona('gym', 'GYM', {
    descripcion: 'Gimnasio equipado con máquinas modernas',
    horarioApertura: '05:00', horarioCierre: '23:00',
    duracionMinima: 30, duracionMaxima: 120,
  }),
  coworking: buildGestionZona('coworking', 'Coworking', {
    descripcion: 'Espacio de trabajo compartido',
    horarioApertura: '07:00', horarioCierre: '22:00',
    duracionMaxima: 480, costoReserva: 0,
  }),
  tenis: buildGestionZona('tenis', 'Tenis', {
    descripcion: 'Cancha de tenis',
    horarioApertura: '06:00', horarioCierre: '21:00',
    duracionMinima: 60, duracionMaxima: 120,
    montoGarantia: 20000,
  }),
  'sala-juegos': buildGestionZona('sala-juegos', 'Sala de juegos', {
    descripcion: 'Sala de juegos con billar y ping pong',
    horarioApertura: '10:00', horarioCierre: '22:00',
    duracionMinima: 60, duracionMaxima: 180,
  }),
  lavanderia: buildGestionZona('lavanderia', 'Lavandería', {
    descripcion: 'Lavandería comunitaria',
    horarioApertura: '06:00', horarioCierre: '22:00',
    duracionMinima: 30, duracionMaxima: 120,
    costoReserva: 5000,
  }),
};

// ─── COMUNICACIÓN / CHAT ─────────────────────────────────────────────────────

export const mensajesChat = [
  {
    id: 1,
    de: 'portero',
    texto: 'Hola Mario, buenas noches tenemos un amigo tuyo en recepción.',
    hora: '18:05',
    fecha: '25/9/25',
    avatarEmoji: '👮',
    leido: true,
  },
  {
    id: 2,
    de: 'residente',
    texto: 'Ah si ahora bajo muchas gracias por avisarme saludos.',
    hora: '18:05',
    fecha: '25/9/25',
    avatarEmoji: '🏢',
    leido: true,
  },
];

// ─── NOTIFICACIONES ──────────────────────────────────────────────────────────
// Datos diferenciados por rol — cada perfil recibe novedades relevantes a su
// función dentro de la comunidad (Residente / Seguridad / Administrador).

export const notificaciones = {
  residente: [
    { id: 1, emoji: '📦', titulo: 'Correspondencia recibida', mensaje: 'Tienes un nuevo paquete esperando en portería.', hora: '09:40', fecha: 'Hoy', leida: false },
    { id: 2, emoji: '🔑', titulo: 'Visita aprobada', mensaje: 'Tu invitado Mario Gómez fue autorizado a ingresar.', hora: '08:15', fecha: 'Hoy', leida: false },
    { id: 3, emoji: '🏖️', titulo: 'Reserva confirmada', mensaje: 'Tu reserva en Piscina para mañana quedó confirmada.', hora: '19:22', fecha: 'Ayer', leida: true },
    { id: 4, emoji: '📢', titulo: 'Aviso de la comunidad', mensaje: 'Corte de agua programado el sábado de 08:00 a 12:00.', hora: '14:05', fecha: 'Ayer', leida: true },
  ],
  guardia: [
    { id: 1, emoji: '🔑', titulo: 'Nueva visita por autorizar', mensaje: 'El Departamento 506 C registró una visita para hoy.', hora: '10:12', fecha: 'Hoy', leida: false },
    { id: 2, emoji: '🚪', titulo: 'Ingreso de visitante', mensaje: 'Mario Gómez ingresó por la garita Principal.', hora: '09:50', fecha: 'Hoy', leida: false },
    { id: 3, emoji: '📋', titulo: 'Cambio de turno', mensaje: 'Tu turno de hoy fue actualizado: 14:00 a 20:00.', hora: '07:30', fecha: 'Hoy', leida: true },
    { id: 4, emoji: '🚗', titulo: 'Vehículo sin registrar', mensaje: 'Se reportó un vehículo sin registro en la cochera de visitas.', hora: '21:48', fecha: 'Ayer', leida: true },
  ],
  administrador: [
    { id: 1, emoji: '🛡️', titulo: 'Nuevo guardia creado', mensaje: 'Se agregó un nuevo guardia al equipo de seguridad.', hora: '11:05', fecha: 'Hoy', leida: false },
    { id: 2, emoji: '🏗️', titulo: 'Arquitectura actualizada', mensaje: 'Se editó la información de la Torre N°2.', hora: '10:30', fecha: 'Hoy', leida: false },
    { id: 3, emoji: '🔐', titulo: 'Permisos modificados', mensaje: 'Se guardaron nuevos permisos para las viviendas.', hora: '17:40', fecha: 'Ayer', leida: true },
    { id: 4, emoji: '💬', titulo: 'Nuevo mensaje en chat', mensaje: 'Un residente envió un mensaje a portería.', hora: '16:02', fecha: 'Ayer', leida: true },
  ],
};

// ─── EDIFICIO ────────────────────────────────────────────────────────────────

export const edificios = [
  'Las Barranqueras 246',
  'Los Pinos 123',
  'Villa Del Sol 500',
];

export const departamentos = ['101', '102', '103', '104', '105', '106', '201', '202', '302', '506 C'];

// ─── ADMINISTRADOR · ARQUITECTURA ───────────────────────────────────────────

export const arquitecturaTorres = [
  {
    id: 1, numero: 1, depto: '9', penthouse: '2', tipo: 'Alfabético',
    cocherasVisitas: '10', cocherasPrivadas: '60', almacenPrivados: '20',
    entradasPeatonales: '2', entradasVehiculares: '2', mascotas: 'Sí', ninos: 'Sí',
  },
  {
    id: 2, numero: 2, depto: '9', penthouse: '2', tipo: 'Alfabético',
    cocherasVisitas: '10', cocherasPrivadas: '60', almacenPrivados: '20',
    entradasPeatonales: '2', entradasVehiculares: '2', mascotas: 'Sí', ninos: 'Sí',
  },
  {
    id: 3, numero: 3, depto: '9', penthouse: '2', tipo: 'Alfabético',
    cocherasVisitas: '10', cocherasPrivadas: '60', almacenPrivados: '20',
    entradasPeatonales: '2', entradasVehiculares: '2', mascotas: 'Sí', ninos: 'Sí',
  },
];

export const deptosPorTorre = ['6', '9', '12', '15', '20'];
export const penthousesOpciones = ['0', '1', '2', '3', '4'];
export const tiposNumeracion = ['Alfabético', 'Numérico'];
export const cocherasVisitasOpciones = ['0', '5', '10', '15', '20'];
export const cocherasPrivadasOpciones = ['10', '20', '40', '60', '80'];
export const almacenesPrivadosOpciones = ['0', '10', '20', '30'];
export const entradasOpciones = ['1', '2', '3'];
export const opcionesSiNo = ['Sí', 'No'];

// ─── ADMINISTRADOR · TIPOLOGÍAS ─────────────────────────────────────────────

export const tipologiasData = [
  { id: 1, nombre: 'Estándar', capacidadMaxima: 4 },
  { id: 2, nombre: 'Premium', capacidadMaxima: 6 },
  { id: 3, nombre: 'Suite', capacidadMaxima: 8 },
];

// ─── ADMINISTRADOR · PORTERÍAS ──────────────────────────────────────────────

export const porteriasData = [
  { id: 1, nombre: 'Principal', ubicacion: 'Entrada principal del condominio', telefono: '+593 999999001' },
  { id: 2, nombre: 'Secundaria', ubicacion: 'Acceso vehicular trasero', telefono: '+593 999999002' },
];

// ─── ADMINISTRADOR · ESTACIONAMIENTOS VISITANTES ────────────────────────────

export const estacionamientosVisitantesData = {
  total: 20,
  ocupados: 3,
  reglas: 'Máximo 2 horas. Registro obligatorio en portería. No reservar con más de 24h de anticipación.',
};

// ─── ADMINISTRADOR · BLOQUES ────────────────────────────────────────────────

export const bloquesData = [
  { id: 1, nombre: 'A', descripcion: 'Bloque A - Torres 1 a 3' },
  { id: 2, nombre: 'B', descripcion: 'Bloque B - Torres 4 a 6' },
];

// ─── ADMINISTRADOR · UNIDADES (DEPARTAMENTOS) ────────────────────────────────

export const unidadesData = [
  // Torre 1
  { id: 1, codigo: '101', torreNumero: 1, piso: 1, bloqueId: null, tipologiaId: 1, estacionamientos: 1, propietarioAsignado: 'Ana Flores', propietarioEmail: 'ana@ejemplo.com', estado: 'config-completado', configuracionId: null },
  { id: 2, codigo: '102', torreNumero: 1, piso: 1, bloqueId: null, tipologiaId: 1, estacionamientos: 1, propietarioAsignado: null, propietarioEmail: null, estado: 'disponible', configuracionId: null },
  { id: 3, codigo: '103', torreNumero: 1, piso: 1, bloqueId: null, tipologiaId: 2, estacionamientos: 2, propietarioAsignado: null, propietarioEmail: null, estado: 'disponible', configuracionId: null },
  { id: 6, codigo: '201', torreNumero: 1, piso: 2, bloqueId: null, tipologiaId: 2, estacionamientos: 1, propietarioAsignado: 'Guillermo Paredes', propietarioEmail: 'guillermo@veciyo.com', estado: 'invitado', configuracionId: null },
  { id: 7, codigo: '202', torreNumero: 1, piso: 2, bloqueId: null, tipologiaId: 1, estacionamientos: 1, propietarioAsignado: null, propietarioEmail: null, estado: 'disponible', configuracionId: null },
  { id: 8, codigo: '301', torreNumero: 1, piso: 3, bloqueId: null, tipologiaId: 2, estacionamientos: 2, propietarioAsignado: 'Carlos Mendoza', propietarioEmail: 'carlos@ejemplo.com', estado: 'aceptado', configuracionId: null },
  { id: 9, codigo: '302', torreNumero: 1, piso: 3, bloqueId: null, tipologiaId: 1, estacionamientos: 1, propietarioAsignado: null, propietarioEmail: null, estado: 'disponible', configuracionId: null },
  { id: 10, codigo: 'PH-1', torreNumero: 1, piso: 9, bloqueId: null, tipologiaId: 3, estacionamientos: 2, propietarioAsignado: null, propietarioEmail: null, estado: 'disponible', configuracionId: null },
  // Torre 2
  { id: 4, codigo: '101', torreNumero: 2, piso: 1, bloqueId: null, tipologiaId: 1, estacionamientos: 1, propietarioAsignado: null, propietarioEmail: null, estado: 'disponible', configuracionId: null },
  { id: 11, codigo: '102', torreNumero: 2, piso: 1, bloqueId: null, tipologiaId: 1, estacionamientos: 1, propietarioAsignado: null, propietarioEmail: null, estado: 'disponible', configuracionId: null },
  { id: 12, codigo: '201', torreNumero: 2, piso: 2, bloqueId: null, tipologiaId: 2, estacionamientos: 2, propietarioAsignado: 'Maria Juarez', propietarioEmail: 'maria@ejemplo.com', estado: 'config-completado', configuracionId: null },
  // Torre 3
  { id: 13, codigo: '101', torreNumero: 3, piso: 1, bloqueId: null, tipologiaId: 1, estacionamientos: 1, propietarioAsignado: null, propietarioEmail: null, estado: 'disponible', configuracionId: null },
  { id: 14, codigo: '102', torreNumero: 3, piso: 1, bloqueId: null, tipologiaId: 2, estacionamientos: 2, propietarioAsignado: null, propietarioEmail: null, estado: 'disponible', configuracionId: null },
  { id: 15, codigo: '103', torreNumero: 3, piso: 1, bloqueId: null, tipologiaId: 1, estacionamientos: 1, propietarioAsignado: null, propietarioEmail: null, estado: 'disponible', configuracionId: null },
];

// ─── ADMINISTRADOR · ASIGNACIÓN DE PROPIETARIOS ──────────────────────────────

export const propietariosInvitedData = [
  { id: 1, nombre: 'Carlos Mendoza', email: 'carlos@ejemplo.com', unidadId: 8, estado: 'aceptada', fechaInvitacion: '01/06/2026' },
  { id: 2, nombre: 'Guillermo Paredes', email: 'guillermo@veciyo.com', unidadId: 6, estado: 'pendiente', fechaInvitacion: '01/07/2026' },
];

// ─── ADMINISTRADOR · PERMISOS ───────────────────────────────────────────────

export const permisosViviendas = {
  entregaDirecta: true,
  huespedesTemporales: true,
  estanciaCorta: {
    permiteVisitas: 'Sí',
    estanciaMinima: '2 días',
    permiteHuespedNinos: 'Sí',
    permiteMascotas: 'No',
    permiteCocherasVisit: 'Sí',
    horarioCheckin: '08:30 a 13:30',
  },
  estanciaLarga: {
    permiteVisitas: 'Sí',
    estanciaMinima: '2 días',
    permiteHuespedNinos: 'Sí',
    permiteMascotas: 'No',
    permiteCocherasVisit: 'Sí',
    horarioCheckin: '08:30 a 13:30',
  },
};

export const estanciasMinimas = ['1 día', '2 días', '3 días', '7 días'];
export const horariosCheckin = ['08:30 a 13:30', '14:00 a 20:00', '24 horas'];

// ─── ADMINISTRADOR · SEGURIDAD ──────────────────────────────────────────────

export const guardiasSeguridad = [
  {
    id: 1, nombre: 'Roberto Hornado', correo: 'roberto.hornado@gmail.com', cedula: '2975186114',
    diasCalendario: 'Quito', garita: 'Principal',
    turnos: [{ dia: 'Lunes', hora: '18:00 a 24:00' }, { dia: 'Miércoles', hora: '18:00 a 24:00' }],
  },
  {
    id: 2, nombre: 'Juan Franco', correo: 'juan.franco@gmail.com', cedula: '29748676114',
    diasCalendario: 'Quito', garita: 'Principal',
    turnos: [{ dia: 'Martes', hora: '00:00 a 06:00' }, { dia: 'Jueves', hora: '00:00 a 06:00' }],
  },
];

export const ciudadesCalendario = ['Quito', 'Guayaquil', 'Cuenca'];
export const diasSemana = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
export const rangosHora = ['00:00 a 06:00', '06:00 a 12:00', '12:00 a 18:00', '18:00 a 24:00'];
export const garitas = ['Principal', 'Secundaria', 'Peatonal', 'Vehicular'];

// ─── PROPIETARIO ─────────────────────────────────────────────────────────────

export const residentesPropietarioInit = [
  { id: 1, nombre: 'Alberto Manual', rol: 'Residente Lider', ci: '1782753580', fecha: '14/05/2024', correo: '', tipo: '', codigoArea: '', telefono: '', contactoNombre: '', contactoCodigo: '', contactoTelefono: '', fechaInicio: '', duracion: '', montoAlquiler: '', monitoreoPago: false, servicios: {} },
  { id: 2, nombre: 'Sofia Martinez', rol: 'Residente', ci: '1759632584', fecha: '22/06/2024', correo: '', tipo: '', codigoArea: '', telefono: '', contactoNombre: '', contactoCodigo: '', contactoTelefono: '', fechaInicio: '', duracion: '', montoAlquiler: '', monitoreoPago: false, servicios: {} },
  { id: 3, nombre: 'Luis Torres', rol: 'Residente', ci: '1824507896', fecha: '30/07/2024', correo: '', tipo: '', codigoArea: '', telefono: '', contactoNombre: '', contactoCodigo: '', contactoTelefono: '', fechaInicio: '', duracion: '', montoAlquiler: '', monitoreoPago: false, servicios: {} },
];

// ─── INQUILINO LÍDER ─────────────────────────────────────────────────────────

export const inquilinoLiderReputacion = {
  nombre: 'Guillermo',
  nivel: 'Nivel Plata',
  logros: [
    { key: 'reciclador', label: 'Reciclador', emoji: '♻️', conseguido: true },
    { key: 'atento', label: 'Atento', emoji: '🤝', conseguido: true },
    { key: 'logro3', label: 'Sin logro', emoji: '🏅', conseguido: false },
    { key: 'logro4', label: 'Sin logro', emoji: '🏅', conseguido: false },
    { key: 'logro5', label: 'Sin logro', emoji: '🏅', conseguido: false },
  ],
};

// Reputación: insignias acumuladas por nivel de cumplimiento (Inquilino y Propietario)
export const reputacionInsignias = {
  inquilino: [
    { key: 'animal-lover', icono: 'logro5', label: 'Animal Lover', progreso: 1, total: 3, nivel: 2, nivelTotal: 3 },
    { key: 'deportista', icono: 'oro', label: 'Deportista', progreso: 2, total: 3, nivel: 3, nivelTotal: 3 },
    { key: 'inovador-1', icono: 'logro3', label: 'Inovador', progreso: 1, total: 3, nivel: 1, nivelTotal: 3 },
    { key: 'inovador-2', icono: 'logro4', label: 'Inovador', progreso: 1, total: 3, nivel: 1, nivelTotal: 3 },
    { key: 'inovador-3', icono: 'reciclador', label: 'Inovador', progreso: 1, total: 3, nivel: 1, nivelTotal: 3 },
  ],
  propietario: [
    { key: 'animal-lover-prop', icono: 'logro5', label: 'Animal Lover', progreso: 1, total: 3, nivel: 2, nivelTotal: 3 },
    { key: 'deportista-prop', icono: 'oro', label: 'Deportista', progreso: 2, total: 3, nivel: 3, nivelTotal: 3 },
    { key: 'inovador-prop-1', icono: 'logro3', label: 'Inovador', progreso: 1, total: 3, nivel: 1, nivelTotal: 3 },
  ],
};

export const agendaHoyInquilinoLider = [
  { id: 1, titulo: 'Niñera', hora: '14:30hs' },
  { id: 2, titulo: 'Parquero', hora: '15:30hs' },
  { id: 3, titulo: 'Consulta Medica', hora: '18:30hs' },
];

// Cuadro de Honor: tabla de medallas recolectadas por los integrantes del condominio.
export const cuadroHonorEstados = ['Atrasado', 'Deudor', 'Al día'];

export const cuadroHonorDepartamentos = [
  { id: 1, departamento: 'Departamento 506 C', responsable: 'Maria Juarez', estado: 'Atrasado', contador: '1/2', medallas: [true, true, true, false, false] },
  { id: 2, departamento: 'Departamento 507 A', responsable: 'Maria Juarez', estado: 'Al día',   contador: '2/2', medallas: [true, true, true, true, false] },
  { id: 3, departamento: 'Departamento 508 B', responsable: 'Maria Juarez', estado: 'Deudor',   contador: '3/2', medallas: [true, true, true, false, true] },
  { id: 4, departamento: 'Departamento 509 C', responsable: 'Maria Juarez', estado: 'Al día',   contador: '1/2', medallas: [true, false, false, false, false] },
];

export const torresCuadroHonor = ['A', 'B', 'C'];
export const departamentosFiltroCuadroHonor = ['100-200', '201-300', '301-400', '501-600'];
export const administradoresCuadroHonor = ['Carola', 'Soller'];
export const administradorCuadroHonor = { nombre: 'Soller' };

export const trofeosReconocimiento = [
  { id: 1, nombre: 'Niki56' },
  { id: 2, nombre: 'AlexSmith' },
  { id: 3, nombre: 'JordanLee' },
  { id: 4, nombre: 'Nick6417' },
];

export const ubicacionesInquilinoLiderInit = [
  { id: 1, direccion: 'Lima, Lima, Mira Flores, San Antonio', alias: 'Casa Amorcito', favorito: true },
  { id: 2, direccion: 'Cusco, Cusco, San Blas, Wanchaq', alias: 'Casa Mama', favorito: false },
];

export const ubicacionesGuardiaInit = [
  { id: 1, direccion: 'Lima, Lima, Mira Flores, Los Pinos 123', alias: 'Edificio Los Pinos', favorito: true },
  { id: 2, direccion: 'Lima, Lima, San Isidro, Av. Principal 456', alias: 'Edificio Canvas', favorito: false },
];

export const distritosUbicacion = ['Mira Flores', 'San Isidro', 'San Borja', 'Surco', 'San Blas'];
export const urbanizacionesUbicacion = ['San Antonio', 'La Flor', 'Unión', 'Wanchaq', 'Santa Mónica'];

// Anuncios: comunicados publicados a los residentes, con votación opcional.
export const anunciosCategorias = ['Servicios', 'Eventos', 'Mantenimiento', 'Seguridad', 'Administración'];
export const anunciosDestinatarios = ['Todos los residentes', 'Propietarios', 'Inquilinos', 'Administración'];

export const anuncios = [
  {
    id: 697,
    categoria: 'Servicios',
    titulo: 'Corte de Gas',
    descripcion: 'Se plantean mejoras para el espacio compartido para que todos podamos disfrutar en familia, anexando juegos para menores con seguridad, mas tachos de basura y un baño con cambiador. $50 por departamento para el mes de julio.',
    fechaPublicada: '10/04/2025',
    fechaFinalizacion: '16/04/2025',
    fechaCorta: '22/10/2024',
    votacion: true,
    progreso: 50,
    umbral: 70,
    ocultarResultados: true,
    opcionesVotacion: ['A favor', 'En contra', 'Abstención'],
    votosSi: ['A100', 'B100', 'C100', 'A101', 'B101', 'C101', 'A102', 'B102', 'C102', 'A103', 'B103', 'C103'],
    votosNo: ['A101', 'B120', 'C103', 'A158', 'B991', 'C108', 'A177', 'B102', 'C102', 'A138', 'B143', 'C183'],
  },
  {
    id: 698,
    categoria: 'Servicios',
    titulo: 'Corte de Gas',
    descripcion: 'Se informa a todos los residentes que el día 24/10/2024 se realizará un corte programado del suministro de gas para tareas de mantenimiento preventivo en la red del condominio.',
    fechaPublicada: '08/04/2025',
    fechaFinalizacion: '14/04/2025',
    fechaCorta: '22/10/2024',
    votacion: false,
  },
  {
    id: 699,
    categoria: 'Servicios',
    titulo: 'Corte de Gas',
    descripcion: 'Recordatorio: durante el corte de gas programado, los ascensores y bombas de agua funcionarán con normalidad gracias al generador de emergencia.',
    fechaPublicada: '06/04/2025',
    fechaFinalizacion: '12/04/2025',
    fechaCorta: '22/10/2024',
    votacion: false,
  },
];

// Reglamentos: estado de inscripción al programa "VeciYo Huésped Temporal" por departamento.
export const reglasEstados = ['Inscripto', 'No inscripto', 'Pendiente'];

export const reglasDepartamentos = [
  { id: 1, departamento: 'Dpto 100 A', responsable: 'Maria Perez', estado: 'Inscripto', administrador: 'Carlos Gómez', anfitrion: 'María Pérez', propietario: 'Juan López', telAdmin: '+51999888777', telAnfitrion: '+51999777666', telPropietario: '+51999666555' },
  { id: 2, departamento: 'Dpto 101 A', responsable: 'Maria Perez', estado: 'No inscripto', administrador: 'Carlos Gómez', anfitrion: 'María Pérez', propietario: 'Juan López', telAdmin: '+51999888777', telAnfitrion: '+51999777666', telPropietario: '+51999666555' },
  { id: 3, departamento: 'Dpto 102 B', responsable: 'Maria Perez', estado: 'Pendiente', administrador: 'Carlos Gómez', anfitrion: 'María Pérez', propietario: 'Juan López', telAdmin: '+51999888777', telAnfitrion: '+51999777666', telPropietario: '+51999666555' },
];

export const reglasTorres = ['A', 'B', 'C'];
export const reglasDepartamentosFiltro = ['100', '101', '102'];
export const reglasPisos = ['1', '2', '3', '4'];
export const reglasPuntuaciones = ['Nivel 1', 'Nivel 2', 'Nivel 3', 'Nivel 4'];

const REGLAS_SECCIONES_BASE = [
  {
    titulo: null,
    items: [
      'Vivir en paz y sin interrupciones, lo que se conoce como "uso tranquilo"',
      'Quejarse con el propietario si otros inquilinos lo molestan',
      'Suspender el pago del alquiler si el propietario no cumple con sus obligaciones de mantenimiento',
    ],
  },
  {
    titulo: 'Obligaciones del inquilino',
    items: [
      'Pagar la renta y otros gastos pactados en tiempo y forma',
      'Cuidar y mantener el inmueble',
      'Permitir el acceso al propietario para reparaciones',
      'No realizar obras sin consentimiento',
      'Respetar las normas de la comunidad',
      'Devolver el inmueble en buen estado',
      'Responder por los daños en el inmueble cuando son causados por él mismo, familiares o sus visitas',
    ],
  },
  {
    titulo: 'Plazos del contrato',
    items: [
      'El plazo máximo de contrato es de 20 años para viviendas y 50 años para locales comerciales',
    ],
  },
];

export const reglasContenido = {
  'residente-permanente': {
    titulo: 'Residente Permanente',
    archivo: 'ResidentesPermanentes.pdf',
    encabezado: 'Reglamento',
    mostrarDescarga: true,
    secciones: REGLAS_SECCIONES_BASE,
  },
  'guardia-seguridad': {
    titulo: 'Guardia de Seguridad',
    archivo: 'GuardiaSeguridad.pdf',
    encabezado: 'Reglamento',
    mostrarDescarga: true,
    secciones: [
      {
        titulo: 'Funciones del Guardia',
        items: [
          'Controlar el ingreso y salida de personas y vehículos',
          'Verificar la identidad de visitantes y residentes',
          'Reportar任何 incidente de seguridad al administrador',
          'Mantener el orden en áreas comunes',
          'Cumplir con los horarios de turno establecidos',
        ],
      },
      {
        titulo: 'Normas de conducta',
        items: [
          'Mantener una actitud profesional y respetuosa',
          'Usar el uniforme reglamentario durante el turno',
          'No consumir alimentos en el puesto de vigilancia',
          'Mantener la garita limpia y ordenada',
        ],
      },
    ],
  },
  'huesped-temporal': {
    titulo: 'Huéspedes Temporales',
    archivo: 'ResidentesTemporales.pdf',
    encabezado: 'Reglamento',
    mostrarDescarga: true,
    secciones: REGLAS_SECCIONES_BASE,
  },
  'veciyo-huesped-temporal': {
    titulo: 'Reglamentos',
    archivo: 'ResidentesTemporales.pdf',
    encabezado: 'Información suscripción VeciYo Huésped Temporal',
    mostrarDescarga: false,
    secciones: REGLAS_SECCIONES_BASE,
  },
};

export const contactosDepartamento = {
  administrador: { nombre: 'Carlos Gómez', telefono: '+51999888777' },
  anfitrion: { nombre: 'María Pérez', telefono: '+51999777666' },
  propietario: { nombre: 'Juan López', telefono: '+51999666555' },
};

// ─── PERFIL · SEGURIDAD Y SOPORTE ───────────────────────────────────────────

export const seguridadInit = {
  correoRespaldo: 'marialalu@gmail.com',
  faceId: false,
  huellaDactilar: false,
  f2a: false,
  pausarCuenta: false,
};

// ─── PERFIL · CONFIGURACIÓN DE APP ──────────────────────────────────────────

export const configuracionAppInit = {
  codigoPais: '+59',
  telefono: '946376164',
  correo: 'guillermix@gmail.com',
  alias: 'Guilleelpeluca',
  modoDaltonico: false,
  fuenteAumentada: false,
  modoOscuro: false,
};

export const categoriasReclamo = ['Consulta', 'Pregunta', 'Sugerencia', 'Reclamo', 'Queja', 'Ideas', 'Denuncia entre departamentos', 'Reporte de huésped'];
export const tiposReclamo = ['Mantenimiento', 'Seguridad', 'Convivencia', 'Pagos', 'Otro', 'Ruido', 'Suciedad', 'Otras'];
export const estadosReclamo = ['Pendiente', 'En curso', 'Resuelto'];

export const reclamosInit = [
  {
    id: 1234,
    numero: '1234',
    nombre: 'Ana Flores',
    ci: '1782753581',
    titulo: 'Consulta sobre horarios de piscina',
    descripcion: 'Quisiera saber cuáles son los horarios habilitados para usar la piscina durante los fines de semana y si hay restricciones para menores de edad.',
    modelo: 'iPhone 14',
    categoria: 'Consulta',
    tipo: 'Convivencia',
    estado: 'Resuelto',
    fechaCreacion: '15/05/2024',
    fechaRevision: '18/05/2024',
    resolucionAdmin: 'Los horarios de piscina son de 08:00 a 20:00 todos los días. Los menores deben estar acompañados de un adulto responsable.',
  },
  {
    id: 5463,
    numero: '5463',
    nombre: 'Ana Flores',
    ci: '1782753581',
    titulo: 'Fuga de agua en la cocina perdida constante',
    descripcion: 'Fuga de agua en la cocina perdida constante\nFuga de agua en la cocina perdida constante\nFuga de agua en la cocina perdida constante\nFuga de agua en la cocina perdida constante',
    modelo: 'iPhone 16 pro max',
    categoria: 'Reclamo',
    tipo: 'Mantenimiento',
    estado: 'En curso',
    fechaCreacion: '22/10/2024',
    fechaRevision: '24/10/2024',
  },
  {
    id: 2535,
    numero: '2535',
    nombre: 'Anuel Flores',
    ci: '1785643581',
    titulo: 'Sugerencia para mejorar la iluminación del estacionamiento',
    descripcion: 'El estacionamiento del sótano tiene poca iluminación. Sugiero instalar luces LED con sensores de movimiento para mayor seguridad.',
    modelo: 'Samsung Galaxy S23',
    categoria: 'Sugerencia',
    tipo: 'Seguridad',
    estado: 'Pendiente',
    fechaCreacion: '15/05/2024',
    fechaRevision: '15/05/2024',
  },
  {
    id: 5679,
    numero: '5679',
    nombre: 'Anuel Flores',
    ci: '1785643581',
    titulo: 'Cobro duplicado en cuota de mantenimiento',
    descripcion: 'En el último estado de cuenta aparece el cobro de la cuota de mantenimiento dos veces para la misma unidad.',
    modelo: 'Motorola Edge 40',
    categoria: 'Reclamo',
    tipo: 'Pagos',
    estado: 'Pendiente',
    fechaCreacion: '15/05/2024',
    fechaRevision: '15/05/2024',
  },
  {
    id: 8910,
    numero: '8910',
    nombre: 'Carlos Méndez',
    ci: '1791234567',
    titulo: '¿Cómo puedo registrar a un familiar como residente?',
    descripcion: 'Necesito saber cuál es el procedimiento para registrar a mi hermana como residente permanente del departamento.',
    modelo: 'iPhone 15',
    categoria: 'Pregunta',
    tipo: 'Otras',
    estado: 'Resuelto',
    fechaCreacion: '10/03/2025',
    fechaRevision: '12/03/2025',
    resolucionAdmin: 'Debe ingresar a Configuración > Agregar Familiar y completar los datos solicitados. Si tiene dudas, puede contactar a soporte.',
  },
  {
    id: 8911,
    numero: '8911',
    nombre: 'María Juarez',
    ci: '1723456789',
    titulo: 'Consulta sobre días de recolección de basura',
    descripcion: '¿Cuáles son los días y horarios de recolección de basura? Encontré bolsas acumuladas y no sé cuándo sacarlas.',
    modelo: 'Samsung Galaxy S24',
    categoria: 'Consulta',
    tipo: 'Servicios',
    estado: 'Resuelto',
    fechaCreacion: '05/02/2025',
    fechaRevision: '07/02/2025',
    resolucionAdmin: 'La recolección de basura se realiza los lunes, miércoles y viernes de 18:00 a 20:00. Los residuos deben sacarse en bolsas cerradas.',
  },
  {
    id: 8912,
    numero: '8912',
    nombre: 'Sofia Martinez',
    ci: '1759632584',
    titulo: 'Sugerencia de taller de convivencia vecinal',
    descripcion: 'Propongo organizar un taller trimestral de convivencia para mejorar la comunicación entre vecinos y resolver conflictos de forma pacífica.',
    modelo: 'Pixel 8',
    categoria: 'Sugerencia',
    tipo: 'Otras',
    estado: 'Resuelto',
    fechaCreacion: '20/01/2025',
    fechaRevision: '22/01/2025',
    resolucionAdmin: 'Gracias por la sugerencia. Se evaluará la propuesta en la próxima reunión de administración.',
  },
];

export const faqItems = [
  { id: 1, categoria: 'Seguridad', pregunta: '¿Cómo cambio mi contraseña?', respuesta: 'Ingresa a Perfil > Seguridad > Cambiar Contraseña. Te enviaremos un enlace de restablecimiento a tu correo de respaldo, válido por 15 minutos.' },
  { id: 2, categoria: 'Seguridad', pregunta: '¿Cómo configuro mi F2A?', respuesta: 'En Perfil > Seguridad > Usabilidad, activa el interruptor "Factor F2A" y sigue los pasos para vincular tu app de autenticación.' },
  { id: 3, categoria: 'Comunidad', pregunta: '¿Cómo uso el chat?', respuesta: 'Desde el inicio, toca el ícono de mensaje flotante para abrir el chat con portería o administración.' },
  { id: 4, categoria: 'Comunidad', pregunta: '¿Me puede escribir el portero?', respuesta: 'Sí, el personal de portería puede iniciar una conversación contigo a través del chat de la app cuando sea necesario.' },
  { id: 5, categoria: 'Puntos', pregunta: '¿Cómo sumo puntos?', respuesta: 'Sumas puntos al participar en actividades de la comunidad, reciclar y completar tu agenda de tareas como Inquilino Líder.' },
  { id: 6, categoria: 'Puntos', pregunta: '¿Se vencen los puntos?', respuesta: 'Sí, los puntos acumulados vencen a los 12 meses de haber sido otorgados si no se canjean.' },
  { id: 7, categoria: 'Puntos', pregunta: '¿Qué beneficio me dan los puntos?', respuesta: 'Los puntos pueden canjearse por descuentos en cuotas, beneficios con comercios aliados y reconocimientos dentro de tu nivel de reputación.' },
];

export const contactoSoporte = {
  telefono: '+593 952507151',
  email: 'VeciYomanda@gmail.com',
  ubicacion: 'Peru, Miraflores, san salvador 123',
  horarios: '10am → 18:00pm',
};

// ─── SUSCRIPCIONES POR UBICACIÓN ─────────────────────────────────────────────

export const suscripcionesData = {
  12: { activa: true, fechaActivacion: '15/06/2026', metodoPago: 'MasterCard' },
};

// ─── CONFIGURACIÓN HUÉSPEDES TEMPORALES POR UBICACIÓN ────────────────────────

export const configuracionHuespedesTemporalesInit = {
  1: {
    minDias: 2,
    maxHuespedes: 4,
    politicaMascotas: 'no-permitidas',
    aptoNinos: true,
    descripcion: 'Departamento de 2 habitaciones, 1 cama queen, 1 cama individual',
    numHabitaciones: 2,
    numCamas: 2,
    estacionamientos: 1,
    capacidadMaximaAdmin: 6,
    integraciones: {
      airbnb: false,
      booking: false,
      lodgify: false,
    },
    legal: { rnt: 'RNT-12345', tra: true, sire: false },
    staff: [
      { id: 1, nombre: 'Pedro Gómez', rol: 'coanfitrion', telefono: '+593 999888111' },
    ],
  },
  12: {
    minDias: 1,
    maxHuespedes: 3,
    politicaMascotas: 'permitidas',
    aptoNinos: true,
    descripcion: 'Departamento amplio, 1 habitación, 1 cama queen',
    numHabitaciones: 1,
    numCamas: 1,
    estacionamientos: 0,
    capacidadMaximaAdmin: 6,
    integraciones: {
      airbnb: true,
      booking: false,
      lodgify: false,
    },
    legal: { rnt: 'RNT-67890', tra: false, sire: true },
    staff: [],
  },
};

// ─── VERIFICACIONES DOCUMENTALES ─────────────────────────────────────────────

export const verificacionesData = {
  1: {
    0: { estado: 'verificado', documentoTomado: '/mock/captured-doc-1.jpg', documentoOriginal: '/mock/doc-precheckin-1.jpg', fechaVerificacion: '05/07/2026', verificadoPor: 'Roberto Hornado' },
    1: { estado: 'pendiente', documentoTomado: null, documentoOriginal: '/mock/doc-precheckin-2.jpg', fechaVerificacion: null, verificadoPor: null },
    2: { estado: 'no-coincide', documentoTomado: '/mock/captured-doc-3.jpg', documentoOriginal: '/mock/doc-precheckin-3.jpg', fechaVerificacion: '05/07/2026', verificadoPor: 'Roberto Hornado' },
  },
  6: {
    0: { estado: 'verificado', documentoTomado: '/mock/captured-doc-6a.jpg', documentoOriginal: '/mock/doc-precheckin-6a.jpg', fechaVerificacion: '16/07/2026', verificadoPor: 'Juan Franco' },
    1: { estado: 'pendiente', documentoTomado: null, documentoOriginal: '/mock/doc-precheckin-6b.jpg', fechaVerificacion: null, verificadoPor: null },
    2: { estado: 'no-coincide', documentoTomado: '/mock/captured-doc-6c.jpg', documentoOriginal: '/mock/doc-precheckin-6c.jpg', fechaVerificacion: '16/07/2026', verificadoPor: 'Juan Franco' },
  },
};
