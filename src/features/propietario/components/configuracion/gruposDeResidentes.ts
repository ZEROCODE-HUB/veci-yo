import { theme } from "@/config";

export const ROL_COLORES: Record<string, { bg: string; color: string }> = {
  Propietario: { bg: theme.colors.badgeVioletBg, color: theme.colors.badgeVioletText },
  "Inquilino Lider": { bg: theme.colors.warningSoft, color: theme.colors.badgeAmberText },
  Residente: { bg: theme.colors.badgeSkyBg, color: theme.colors.badgeSkyText },
  Corresidente: { bg: theme.colors.badgeSkyBg, color: theme.colors.badgeSkyText },
  Coadministrador: { bg: theme.colors.accentPink, color: theme.colors.accentPinkText },
  Familiar: { bg: theme.colors.successSoft, color: theme.colors.badgeGreenText },
};

/*
  Los grupos tienen que cubrir el enum `rol_unidad` entero. Faltaba
  `huesped_temporal`: se contaba en «Residentes actuales (4)» y no caia en
  ningun grupo, asi que el titulo anunciaba cuatro personas y debajo no habia
  ni una tarjeta. Un rol sin grupo desaparece sin avisar.
*/
export const GRUPOS_JERARQUIA = [
  { titulo: "Residente Inquilino Lider", roles: ["Inquilino Lider"], indent: false },
  { titulo: "Residente", roles: ["Residente", "Corresidente"], indent: true },
  { titulo: "Coadministrador", roles: ["Coadministrador"], indent: false },
  { titulo: "Propietario", roles: ["Propietario"], indent: false },
  // Al final y con su propio título: no son residentes (16/10/2026).
  { titulo: "Huésped Temporal", roles: ["Huesped Temporal"], indent: true },
];

export const ESTILO_DE_TARJETA = {
  backgroundColor: theme.colors.bgCard,
  shadowColor: theme.colors.shadow,
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.08,
  shadowRadius: 8,
  elevation: 3,
};
