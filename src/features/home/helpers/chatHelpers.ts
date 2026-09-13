import { personasTorre, adminList, guardiasSeguridad, AVATAR_MAP, DEFAULT_AVATAR } from '@/data/chatMockData';

export function truncate(text: string, max: number): string {
  if (!text) return '';
  return text.length > max ? text.slice(0, max) + '\u2026' : text;
}

export function filtrarPersonas(torre: string, busqueda: string): string[] {
  if (torre === 'Seguridad') return ['Seguridad'];
  if (torre === 'Administrador') return [...adminList];
  const all = [...personasTorre, ...adminList, ...guardiasSeguridad.map((g) => g.nombre)];
  if (busqueda) return all.filter((p) => p.toLowerCase().includes(busqueda.toLowerCase()));
  return all;
}

export function getAvatarEmoji(nombre: string): string {
  return AVATAR_MAP[nombre] || DEFAULT_AVATAR;
}

export const TORRES_FILTER_OPTIONS = [
  { value: '', label: 'Todas las torres' },
  { value: 'Torre 1', label: 'Torre 1' },
  { value: 'Torre 2', label: 'Torre 2' },
  { value: 'Torre 3', label: 'Torre 3' },
];

export const DEPTOS_FILTER_OPTIONS = (excludeEmpty = true) => {
  const opts = excludeEmpty ? [] : [{ value: '', label: 'Todos los deptos' }];
  return [...opts, ...['101', '102', '103', '104', '105', '106', '201', '202', '301', '302', '303', '304', '305', '306', '401', '402', '403', '404', '405', '406'].map((d) => ({ value: d, label: d }))];
};
