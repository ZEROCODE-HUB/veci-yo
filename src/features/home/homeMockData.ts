// Las notificaciones salen de la tabla `notificacion`, que escriben los
// disparadores de los hechos que las provocan. Las doce fijas que vivian aqui
// estaban agrupadas por rol, asi que todos los propietarios del edificio veian
// el mismo "tienes un paquete en porteria".

// La agenda del dia son las visitas programadas para hoy (`obtenerAgendaHoy`),
// y "regalos por dar" son los vecinos que quedan por reconocer este mes
// (`contarRegalosPorDar`). Antes eran tres visitas inventadas y la constante 1.


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
