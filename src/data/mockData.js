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
  {
    id: 4,
    zonaId: 'piscina',
    depto: 'Departamento 304 A',
    reservaNum: '178452',
    horario: 'Sábado 09 hs a 11 hs.',
    estado: 'Reservado',
  },
  {
    id: 5,
    zonaId: 'piscina',
    depto: 'Departamento 102 B',
    reservaNum: '178453',
    horario: 'Sábado 16 hs a 18 hs.',
    estado: 'Disponible',
  },
  {
    id: 6,
    zonaId: 'parque',
    depto: 'Departamento 201 C',
    reservaNum: '356214',
    horario: 'Lunes 16 hs a 17 hs.',
    estado: 'Disponible',
  },
  {
    id: 7,
    zonaId: 'gym',
    depto: 'Departamento 405 A',
    reservaNum: '498321',
    horario: 'Martes 07 hs a 08 hs.',
    estado: 'Reservado',
  },
  {
    id: 8,
    zonaId: 'gym',
    depto: 'Departamento 110 B',
    reservaNum: '498322',
    horario: 'Miércoles 18 hs a 19 hs.',
    estado: 'No disponible',
  },
  {
    id: 9,
    zonaId: 'coworking',
    depto: 'Departamento 506 C',
    reservaNum: '512873',
    horario: 'Jueves 09 hs a 13 hs.',
    estado: 'Reservado',
  },
  {
    id: 10,
    zonaId: 'tenis',
    depto: 'Departamento 304 A',
    reservaNum: '624190',
    horario: 'Viernes 17 hs a 18 hs.',
    estado: 'Disponible',
  },
  {
    id: 11,
    zonaId: 'sala-juegos',
    depto: 'Departamento 201 C',
    reservaNum: '731065',
    horario: 'Sábado 15 hs a 17 hs.',
    estado: 'Reservado',
  },
  {
    id: 12,
    zonaId: 'lavanderia',
    depto: 'Departamento 102 B',
    reservaNum: '845972',
    horario: 'Domingo 10 hs a 11 hs.',
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

export const agendaHoyInquilinoLider = [
  { id: 1, titulo: 'Niñera', hora: '14:30hs' },
  { id: 2, titulo: 'Parquero', hora: '15:30hs' },
  { id: 3, titulo: 'Consulta Medica', hora: '18:30hs' },
];

export const ubicacionesInquilinoLiderInit = [
  { id: 1, direccion: 'Lima, Lima, Mira Flores, San Antonio', alias: 'Casa Amorcito', favorito: true },
  { id: 2, direccion: 'Cusco, Cusco, San Blas, Wanchaq', alias: 'Casa Mama', favorito: false },
];

export const distritosUbicacion = ['Mira Flores', 'San Isidro', 'San Borja', 'Surco', 'San Blas'];
export const urbanizacionesUbicacion = ['San Antonio', 'La Flor', 'Unión', 'Wanchaq', 'Santa Mónica'];
