export interface DemoRole {
  key: string;
  label: string;
  emoji: string;
  available: boolean;
}

export const DEMO_ROLES: DemoRole[] = [
  {
    key: "propietario",
    label: "Demo Propietario",
    emoji: "🏠",
    available: true,
  },
  {
    key: "propietario-no-residente",
    label: "Demo propietario no residente sin renta corta",
    emoji: "🏠",
    available: true,
  },
  {
    key: "propietario-sin-propiedades",
    label: "Demo Propietario (sin propiedades)",
    emoji: "🏚️",
    available: true,
  },
  { key: "guardia", label: "Demo Seguridad", emoji: "🛡️", available: true },
  {
    key: "administrador",
    label: "Demo Administrador",
    emoji: "🗂️",
    available: true,
  },
  {
    key: "inquilino-lider",
    label: "Demo Residente Inquilino Lider",
    emoji: "🔑",
    available: true,
  },
  {
    key: "huesped-temporal",
    label: "Demo Huésped Temporal",
    emoji: "🧳",
    available: true,
  },
];

export function getDemoRole(key: string): DemoRole | undefined {
  return DEMO_ROLES.find((role) => role.key === key);
}
