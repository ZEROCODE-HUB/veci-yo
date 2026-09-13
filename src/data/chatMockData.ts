import type { MensajeChat, GrupoChat, LlamadaHistorial } from '@/shared/types';

export const guardiasSeguridad = [
  { id: 1, nombre: 'Roberto Hornado', correo: 'roberto.hornado@gmail.com', cedula: '2975186114', garita: 'Principal' },
  { id: 2, nombre: 'Juan Franco', correo: 'juan.franco@gmail.com', cedula: '29748676114', garita: 'Principal' },
];

export const personasTorre = ['Mario', 'Ana', 'Carlos', 'Jorge'];
export const adminList = ['Soller', 'Carola', 'Marcela'];

export const TORRES_OPCIONES = ['Torre 1', 'Torre 2', 'Torre 3', 'Seguridad', 'Administrador'];
export const TORRES_LIMITADAS = ['Seguridad', 'Administrador'];
export const PISOS_OPCIONES = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];
export const DEPTOS_OPCIONES = ['101', '102', '103', '104', '105', '106', '201', '202', '301', '302', '303', '304', '305', '306', '401', '402', '403', '404', '405', '406'];
export const DEPTOS_CALL = Array.from({ length: 20 }, (_, i) => `Departamento ${100 + i + 1}`);

export const AVATAR_MAP: Record<string, string> = {
  Mario: '🏢',
  Ana: '🏢',
  Carlos: '🏢',
  Jorge: '🏢',
  Soller: '🛡️',
  Carola: '🛡️',
  Marcela: '🛡️',
  'Roberto Hornado': '👮',
  'Juan Franco': '👮',
  Seguridad: '👮',
  Administrador: '🛡️',
};

export const DEFAULT_AVATAR = '💬';

export const mensajesChatInit: MensajeChat[] = [
  { id: 1, de: 'portero', texto: 'Hola Mario, buenas noches tenemos un amigo tuyo en recepción.', hora: '18:05', fecha: '25/9/25', avatarEmoji: '👮', leido: true, persona: 'Mario' },
  { id: 2, de: 'residente', texto: 'Ah si ahora bajo muchas gracias por avisarme saludos.', hora: '18:05', fecha: '25/9/25', avatarEmoji: '🏢', leido: true, persona: 'Mario' },
  { id: 3, de: 'portero', texto: 'Buenos días Ana, su paquete de Rappi ha llegado a portería.', hora: '09:30', fecha: '26/9/25', avatarEmoji: '👮', leido: false, persona: 'Ana' },
  { id: 4, de: 'residente', texto: 'Gracias, bajo en un momento a recogerlo.', hora: '09:35', fecha: '26/9/25', avatarEmoji: '🏢', leido: false, persona: 'Ana' },
  { id: 5, de: 'portero', texto: 'Carlos, un técnico de Claro dice que viene a revisar el internet. ¿Lo dejamos pasar?', hora: '14:15', fecha: '26/9/25', avatarEmoji: '👮', leido: false, persona: 'Carlos' },
  { id: 6, de: 'portero', texto: 'Sra. Soller, se recibió una encomienda para administración.', hora: '11:00', fecha: '25/9/25', avatarEmoji: '👮', leido: true, persona: 'Soller' },
];

export const gruposChatInit: GrupoChat[] = [
  {
    id: 'residentes',
    tipo: 'residentes',
    nombre: 'Residentes Edificio Las Barranqueras 246',
    avatarEmoji: '🏘️',
    mensajes: [
      { id: 'gr1', de: 'Ana Flores', texto: 'Buenos días a todos! Alguien sabe cuándo cortan el agua?', hora: '09:15', fecha: '15/07/26', leido: true },
      { id: 'gr2', de: 'Carlos Méndez', texto: 'Hola, creo que es el sábado de 8 a 12.', hora: '09:20', fecha: '15/07/26', leido: true },
      { id: 'gr3', de: 'Soller', texto: 'Confirmo. Corte programado el sábado 18/07 de 08:00 a 12:00 hs.', hora: '09:30', fecha: '15/07/26', leido: false },
    ],
  },
  {
    id: 'propietarios',
    tipo: 'personal',
    nombre: 'Propietarios Edificio Las Barranqueras 246',
    avatarEmoji: '🏠',
    mensajes: [
      { id: 'gp1', de: 'Guillermo Paredes', texto: 'Propongo cambiar el proveedor de limpieza, el actual no está cumpliendo.', hora: '10:00', fecha: '14/07/26', leido: true },
      { id: 'gp2', de: 'Ana Flores', texto: 'Estoy de acuerdo. Podríamos pedir presupuestos a otras empresas.', hora: '10:15', fecha: '14/07/26', leido: true },
    ],
  },
];

export const historialLlamadasInit: LlamadaHistorial[] = [
  { id: 1, tipo: 'saliente', contacto: 'Mario', duracion: '03:25', fecha: '25/9/25', hora: '18:10' },
  { id: 2, tipo: 'saliente', contacto: 'Mario', duracion: '01:15', fecha: '24/9/25', hora: '15:30' },
  { id: 3, tipo: 'perdida', contacto: 'Mario', duracion: '00:00', fecha: '23/9/25', hora: '09:00' },
  { id: 4, tipo: 'saliente', contacto: 'Ana', duracion: '05:10', fecha: '26/9/25', hora: '10:22' },
  { id: 5, tipo: 'perdida', contacto: 'Ana', duracion: '00:00', fecha: '25/9/25', hora: '20:15' },
  { id: 6, tipo: 'saliente', contacto: 'Ana', duracion: '02:30', fecha: '22/9/25', hora: '16:45' },
  { id: 7, tipo: 'saliente', contacto: 'Carlos', duracion: '00:45', fecha: '24/9/25', hora: '12:00' },
  { id: 8, tipo: 'perdida', contacto: 'Carlos', duracion: '00:00', fecha: '20/9/25', hora: '08:30' },
];
