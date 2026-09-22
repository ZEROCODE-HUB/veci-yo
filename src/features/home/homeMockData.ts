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

export const agendaHoy: AgendaItem[] = [
  { id: 1, titulo: 'Niñera', hora: '14:30hs' },
  { id: 2, titulo: 'Parquero', hora: '15:30hs' },
  { id: 3, titulo: 'Consulta Médica', hora: '18:30hs' },
];

export const regalosPorDar = 1;

// ─── INQUILINO LÍDER ─────────────────────────────────────────────────────────

// El cuadro de honor y el historial de cuotas salen ahora de las funciones
// `cuadro_honor` y `resumen_cuotas` (ver `inquilino-lider/services/cuadroHonor.repo.ts`).
// Con ellos se fueron los cuatro departamentos inventados y sus filtros fijos.

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
