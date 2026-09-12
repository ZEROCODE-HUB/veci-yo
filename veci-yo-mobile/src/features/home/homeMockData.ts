import type {
  AgendaItem,
  IngresoSalida,
  Notificacion,
  ReputacionInsignia,
} from "./types";

export const notificaciones: Record<string, Notificacion[]> = {
  residente: [
    { id: 1, emoji: '📦', titulo: 'Correspondencia recibida', mensaje: 'Tienes un paquete de OCA en portería. Retíralo antes del viernes.', hora: '10:30', fecha: 'Hoy', leida: false },
    { id: 2, emoji: '🔑', titulo: 'Visita aprobada', mensaje: 'Tu visita para el sábado ha sido aprobada por el guardia de turno.', hora: '09:15', fecha: 'Hoy', leida: true },
    { id: 3, emoji: '🏖️', titulo: 'Reserva confirmada', mensaje: 'Tu reserva de la piscina para el domingo 12/01 fue confirmada.', hora: '18:00', fecha: 'Ayer', leida: true },
    { id: 4, emoji: '📢', titulo: 'Aviso de la comunidad', mensaje: 'Se realizará mantenimiento del ascensor el miércoles de 9 a 12hs.', hora: '14:00', fecha: 'Ayer', leida: true },
  ],
  guardia: [
    { id: 5, emoji: '👤', titulo: 'Visita por autorizar', mensaje: 'Mario Bonefi solicita ingreso al departamento 105.', hora: '08:45', fecha: 'Hoy', leida: false },
    { id: 6, emoji: '🚗', titulo: 'Ingreso de visitante', mensaje: 'Carlos Mendoza ingresó con vehículo placa ABC-1234.', hora: '08:30', fecha: 'Hoy', leida: true },
    { id: 7, emoji: '🔄', titulo: 'Cambio de turno', mensaje: 'Tu turno nocturno comienza a las 22:00hs.', hora: '21:30', fecha: 'Ayer', leida: true },
    { id: 8, emoji: '🚗', titulo: 'Vehículo sin registrar', mensaje: 'Un vehículo estacionado en L2 no tiene registro de ingreso.', hora: '16:00', fecha: 'Ayer', leida: true },
  ],
  administrador: [
    { id: 9, emoji: '👮', titulo: 'Guardia creado', mensaje: 'Se dio de alta al nuevo guardia: Roberto Andrade.', hora: '11:00', fecha: 'Hoy', leida: false },
    { id: 10, emoji: '🏗️', titulo: 'Arquitectura actualizada', mensaje: 'Se modificó la estructura de torres y departamentos.', hora: '09:30', fecha: 'Hoy', leida: true },
    { id: 11, emoji: '🔐', titulo: 'Permisos modificados', mensaje: 'Se actualizaron los permisos del rol propietario.', hora: '15:00', fecha: 'Ayer', leida: true },
    { id: 12, emoji: '💬', titulo: 'Mensaje en chat', mensaje: 'Guillermo Paredes envió un mensaje en el grupo de propietarios.', hora: '12:00', fecha: 'Ayer', leida: true },
  ],
};

export const reputacionInsignias: ReputacionInsignia[] = [
  { key: 'reciclador', emoji: '♻️', label: 'Reciclador', cantidad: 4 },
  { key: 'atento', emoji: '🤝', label: 'Atento', cantidad: 7 },
  { key: 'deportista', emoji: '🏃', label: 'Deportista', cantidad: 2 },
  { key: 'colaborador', emoji: '🤲', label: 'Colaborador', cantidad: 5 },
  { key: 'amigable', emoji: '😊', label: 'Amigable', cantidad: 3 },
];

export const reputacionInsigniasVecino = reputacionInsignias.map((r) => ({
  key: r.key,
  icono: r.emoji,
  label: r.label,
  cantidad: r.cantidad,
}));

export const ingresosSalidasHoy: IngresoSalida[] = [
  { id: 1, nombre: 'Guillermo Sarpeito', tipo: 'Visitante', depto: '105', horaIngreso: '08:30', horaSalida: '12:00', estado: 'Ingresó' },
  { id: 2, nombre: 'Mario Bonefi', tipo: 'Visitante', depto: '105', horaIngreso: '09:00', horaSalida: '13:00', estado: 'Ingresó' },
  { id: 3, nombre: 'Carlos Mendoza', tipo: 'Proveedor', depto: '201', horaIngreso: '08:00', horaSalida: '10:00', estado: 'Finalizado' },
  { id: 4, nombre: 'Carmen Villalobos', tipo: 'Visitante', depto: '302', horaIngreso: '10:00', horaSalida: '14:00', estado: 'Programado' },
  { id: 5, nombre: 'Diego Villalobos', tipo: 'Profesional', depto: '302', horaIngreso: '11:00', horaSalida: '13:00', estado: 'Programado' },
  { id: 6, nombre: 'Roberto Andrade', tipo: 'Visitante', depto: '401', horaIngreso: '09:30', horaSalida: '12:30', estado: 'Ingresó' },
  { id: 7, nombre: 'María Fernanda López', tipo: 'Huésped temporal', depto: '102', horaIngreso: '14:00', horaSalida: '18:00', estado: 'Programado' },
  { id: 8, nombre: 'Jorge Sarpeito', tipo: 'Visitante', depto: '105', horaIngreso: '15:00', horaSalida: '17:00', estado: 'Programado' },
  { id: 9, nombre: 'Luis F. Soto', tipo: 'Proveedor', depto: 'PB', horaIngreso: '07:30', horaSalida: '09:30', estado: 'Finalizado' },
  { id: 10, nombre: 'Ana Torres', tipo: 'Huésped temporal', depto: '203', horaIngreso: '16:00', horaSalida: '20:00', estado: 'Programado' },
];

export const ingresosSalidasManana: IngresoSalida[] = [
  { id: 11, nombre: 'Pedro Gómez', tipo: 'Visitante', depto: '101', horaIngreso: '09:00', horaSalida: '12:00', estado: 'Programado' },
  { id: 12, nombre: 'Laura Sánchez', tipo: 'Proveedor', depto: '202', horaIngreso: '10:00', horaSalida: '11:30', estado: 'Programado' },
  { id: 13, nombre: 'Fernando Ruiz', tipo: 'Visitante', depto: '303', horaIngreso: '11:00', horaSalida: '14:00', estado: 'Programado' },
  { id: 14, nombre: 'Sofía Díaz', tipo: 'Huésped temporal', depto: '405', horaIngreso: '14:00', horaSalida: '18:00', estado: 'Programado' },
  { id: 15, nombre: 'Martín López', tipo: 'Profesional', depto: '105', horaIngreso: '08:30', horaSalida: '10:00', estado: 'Programado' },
];

export const agendaHoy: AgendaItem[] = [
  { id: 1, titulo: 'Niñera', hora: '14:30hs' },
  { id: 2, titulo: 'Parquero', hora: '15:30hs' },
  { id: 3, titulo: 'Consulta Médica', hora: '18:30hs' },
];

export const regalosPorDar = 1;

// ─── INQUILINO LÍDER ─────────────────────────────────────────────────────────

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

const NOMBRES_MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const CUOTA_MENSUAL_HISTORIAL = 150;

const HISTORIAL_CUOTAS_RAW = [
  { alDia: 2, atrasados: 2 },
  { alDia: 3, atrasados: 1 },
  { alDia: 4, atrasados: 0 },
  { alDia: 3, atrasados: 1 },
  { alDia: 2, atrasados: 2 },
  { alDia: 3, atrasados: 1 },
  { alDia: 2, atrasados: 2 },
  { alDia: 3, atrasados: 1 },
  { alDia: 4, atrasados: 0 },
  { alDia: 3, atrasados: 1 },
  { alDia: 2, atrasados: 2 },
  { alDia: 3, atrasados: 1 },
];

export const cuotaAdministracionHistorial = (() => {
  const hoy = new Date();
  return HISTORIAL_CUOTAS_RAW.map((m, i) => {
    const d = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
    const total = m.alDia + m.atrasados;
    const esperado = total * CUOTA_MENSUAL_HISTORIAL;
    const recibido = m.alDia * CUOTA_MENSUAL_HISTORIAL;
    return {
      mes: `${NOMBRES_MESES[d.getMonth()]} ${d.getFullYear()}`,
      esperado,
      recibido,
      alDia: m.alDia,
      atrasados: m.atrasados,
      porcentaje: esperado > 0 ? Math.round((recibido / esperado) * 100) : 0,
    };
  });
})();

export const distritosUbicacion = ['Mira Flores', 'San Isidro', 'San Borja', 'Surco', 'San Blas'];
export const urbanizacionesUbicacion = ['San Antonio', 'La Flor', 'Unión', 'Wanchaq', 'Santa Mónica'];

export const MODULOS_CONFIG = [
  { id: 'correspondencia', label: 'Correspondencia', icon: require('@/assets/icons/home/correspondencia.png'), screen: 'Correspondencia', helpKey: 'correspondencia' },
  { id: 'visitas', label: 'Visitas', icon: require('@/assets/icons/home/finales/visitas-final-final.png'), screen: 'Visitas', helpKey: 'visitas' },
  { id: 'zonas-comunes', label: 'Zonas Comunes', icon: require('@/assets/icons/home/zonascomunes.png'), screen: 'ZonasComunes', helpKey: 'zonas' },
  { id: 'anuncios', label: 'Anuncios y encuestas', icon: require('@/assets/icons/home/anuncios.png'), screen: 'Anuncios', helpKey: 'anuncios' },
  { id: 'ranking', label: 'Cuadro de Honor', icon: require('@/assets/icons/home/finales/ranking-final-final.png'), screen: 'CuadroHonor', helpKey: 'ranking' },
  { id: 'reglas', label: 'Reglamentos y renta corta', icon: require('@/assets/icons/home/reglas.png'), screen: 'Reglas', helpKey: 'reglas' },
];

export const GUESTBOOK_MODULE = { id: 'mi-alojamiento', label: 'Mi alojamiento', icon: require('@/assets/icons/home/finales/mi_alojamiento.jpg'), screen: 'MiAlojamiento', helpKey: 'mi-alojamiento' };

export const CONFIG_ADMIN_OPCIONES = [
  { key: 'arquitectura', label: 'ARQUITECTURA', screen: 'AdministradorArquitectura' },
  { key: 'permisos', label: 'PERMISOS', screen: 'AdministradorPermisos' },
  { key: 'seguridad', label: 'SEGURIDAD', screen: 'AdministradorSeguridad' },
  { key: 'coadministradores', label: 'COADMINISTRADORES', screen: 'Coadministradores' },
  { key: 'reportes', label: 'REPORTES', screen: 'AdministradorReportes' },
  { key: 'reclamos', label: 'CENTRO DE ATENCIÓN', screen: 'Reclamos' },
];
