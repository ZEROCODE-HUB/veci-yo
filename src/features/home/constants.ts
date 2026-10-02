/**
 * Constantes de presentacion del Home: los modulos de la cuadricula y las
 * opciones del panel de administracion.
 *
 * El archivo se llamaba `constants.ts` y contenia, ademas, notificaciones,
 * agenda, cuadro de honor y reputacion inventados. Todo eso salio a la base en
 * las migraciones del 22/09/2026; lo que queda son iconos y etiquetas.
 */

// ─── INQUILINO LÍDER ─────────────────────────────────────────────────────────


export const MODULOS_CONFIG = [
  { id: 'correspondencia', label: 'Correspondencia', icon: require('@/assets/icons/home/correspondencia.png'), screen: 'Correspondencia', helpKey: 'correspondencia' },
  { id: 'visitas', label: 'Visitas', icon: require('@/assets/icons/home/finales/visitas-porteria.png'), screen: 'Visitas', helpKey: 'visitas' },
  { id: 'zonas-comunes', label: 'Zonas Comunes', icon: require('@/assets/icons/home/zonascomunes.png'), screen: 'ZonasComunes', helpKey: 'zonas' },
  { id: 'anuncios', label: 'Anuncios y encuestas', icon: require('@/assets/icons/home/anuncios.png'), screen: 'Anuncios', helpKey: 'anuncios' },
  { id: 'ranking', label: 'Cuadro de Honor', icon: require('@/assets/icons/home/finales/ranking-final-final.png'), screen: 'CuadroHonor', helpKey: 'ranking' },
  { id: 'reglas', label: 'Reglamentos y renta corta', icon: require('@/assets/icons/home/reglas.png'), screen: 'Reglas', helpKey: 'reglas' },
];

export const GUESTBOOK_MODULE = { id: 'mi-alojamiento', label: 'Mi alojamiento', icon: require('@/assets/icons/home/finales/alojamiento-casa.png'), screen: 'MiAlojamiento', helpKey: 'mi-alojamiento' };

export const CONFIG_ADMIN_OPCIONES = [
  { key: 'arquitectura', label: 'ARQUITECTURA', screen: 'AdministradorArquitectura' },
  { key: 'permisos', label: 'PERMISOS', screen: 'AdministradorPermisos' },
  { key: 'seguridad', label: 'SEGURIDAD', screen: 'AdministradorSeguridad' },
  { key: 'coadministradores', label: 'COADMINISTRADORES', screen: 'Coadministradores' },
  { key: 'reportes', label: 'REPORTES', screen: 'AdministradorReportes' },
  { key: 'reclamos', label: 'CENTRO DE ATENCIÓN', screen: 'Reclamos' },
];
