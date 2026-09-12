export const PERMISOS_COADMIN = [
  ["actualizarResidentes", "Gestionar residentes", "Alta, edición y baja de residentes, inquilinos y propietarios del padrón"],
  ["contestarChat", "Responder chats", "Responder y gestionar los chats de residentes y de portería"],
  ["modificarSeguridad", "Gestionar seguridad", "Crear y editar guardias, porterías, turnos y personal de vigilancia"],
  ["modificarCuadroHonor", "Administrar cuadro de honor", "Editar ranking, medallas, logros y reconocimientos por departamento"],
  ["visualizarVisitas", "Consultar visitas", "Acceso de solo lectura a todas las visitas"],
  ["visualizarCorrespondencia", "Consultar correspondencia", "Ver toda la paquetería y encomiendas registradas"],
  ["visualizarZonasComunes", "Consultar zonas comunes", "Ver reservas, disponibilidad y ocupación"],
  ["visualizarEncuestas", "Consultar encuestas", "Ver encuestas activas, historial y resultados"],
] as const;
export type PermisoCoadministrador = (typeof PERMISOS_COADMIN)[number][0];
export type CoadministradorFormValues = { nombre: string; apellido: string; correo: string; celular: string; permisos: Record<PermisoCoadministrador, boolean> };
export const permisosCoadministradorIniciales = () => Object.fromEntries(PERMISOS_COADMIN.map(([key]) => [key, true])) as Record<PermisoCoadministrador, boolean>;
