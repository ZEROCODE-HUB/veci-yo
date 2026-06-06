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
  },
];

export const categorias = ['Delivery', 'Compra', 'Servicio', 'Otro'];
export const logisticas = ['Rappi', 'DHL', 'Fedex', 'Expreso el pájaro', 'Otro'];
export const estadosEncomienda = ['Buen estado', 'Estado intermedio', 'Mal estado', 'Destruida'];
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
      { nombre: 'Marilu Esterla', llego: false },
      { nombre: 'Mario Bonefi', llego: false },
      { nombre: 'guilermo star', llego: false },
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
    fechaDesde: '01/12/2025',
    fechaHasta: '15/01/2026',
    esEvento: true,
    nombreEvento: 'Evento: Guillermina Sarpeito',
    invitados: [
      { nombre: 'guilermo star', llego: false },
      { nombre: 'guilermo star', llego: false },
      { nombre: 'guilermo star', llego: false },
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

export const reservasZona = [
  {
    id: 1,
    zonaId: 'bbq',
    depto: 'Departamento 506 C',
    reservaNum: '245657',
    horario: 'Domingo 12 hs a 14 hs.',
    estado: 'Reservado',
  },
  {
    id: 2,
    zonaId: 'bbq',
    depto: 'Departamento 506 C',
    reservaNum: '245657',
    horario: 'Domingo 14 hs a 19:30 hs.',
    estado: 'Disponible',
  },
  {
    id: 3,
    zonaId: 'bbq',
    depto: 'Departamento 506 C',
    reservaNum: '245657',
    horario: 'Domingo 14 hs a 19:30 hs.',
    estado: 'No disponible',
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

// ─── COMUNICACIÓN / CHAT ─────────────────────────────────────────────────────

export const mensajesChat = [
  {
    id: 1,
    de: 'portero',
    texto: 'Hola Mario, buenas noches tenemos un amigo tuyo en recepción.',
    hora: '18:05',
    fecha: '25/9/25',
    avatarEmoji: '👮',
  },
  {
    id: 2,
    de: 'residente',
    texto: 'Ah si ahora bajo muchas gracias por avisarme saludos.',
    hora: '18:05',
    fecha: '25/9/25',
    avatarEmoji: '🏢',
  },
];

// ─── EDIFICIO ────────────────────────────────────────────────────────────────

export const edificios = [
  'Las Barranqueras 246',
  'Los Pinos 123',
  'Villa Del Sol 500',
];

export const departamentos = ['101', '102', '103', '104', '105', '106', '201', '202', '302', '506 C'];
