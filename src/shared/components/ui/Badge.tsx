import { theme } from "@/config";
import React from "react";
import { View, Text } from "react-native";

const statusMap: Record<string, { bg: string; color: string }> = {
  Entregado: {
    bg: theme.colors.textSecondary,
    color: theme.colors.textInverse,
  },
  "En Portería": {
    bg: theme.colors.warningDark,
    color: theme.colors.textInverse,
  },
  "No Recibido": { bg: theme.colors.text, color: theme.colors.textInverse },
  Aceptado: { bg: theme.colors.secondary, color: theme.colors.textInverse },
  Pendiente: { bg: theme.colors.border, color: theme.colors.textSecondary },
  Programada: { bg: theme.colors.border, color: theme.colors.textSecondary },
  Cancelado: { bg: theme.colors.dangerLight, color: theme.colors.dangerDark },
  Rechazado: { bg: theme.colors.danger, color: theme.colors.textInverse },
  Ingresado: { bg: theme.colors.success, color: theme.colors.textInverse },
  Aprobado: { bg: theme.colors.success, color: theme.colors.textInverse },
  Denegado: { bg: theme.colors.danger, color: theme.colors.textInverse },
  Verificado: { bg: theme.colors.success, color: theme.colors.textInverse },
  "No coincide": { bg: theme.colors.danger, color: theme.colors.textInverse },
  "En curso": { bg: theme.colors.secondary, color: theme.colors.textInverse },
  Resuelto: { bg: theme.colors.success, color: theme.colors.textInverse },
  Reservado: { bg: theme.colors.primary, color: theme.colors.text },
  "No disponible": {
    bg: theme.colors.border,
    color: theme.colors.textSecondary,
  },
  Disponible: { bg: theme.colors.secondary, color: theme.colors.textInverse },
  Activa: { bg: theme.colors.primary, color: theme.colors.text },
  Finalizado: { bg: theme.colors.secondary, color: theme.colors.textInverse },
};

interface BadgeProps {
  status: string;
  children?: React.ReactNode;
  style?: object;
}

export function Badge({ status, children, style }: BadgeProps) {
  const label = children || status;
  const colors = statusMap[status] || {
    bg: theme.colors.border,
    color: theme.colors.textSecondary,
  };

  return (
    <View
      className="flex-row items-center rounded-full px-3 py-1"
      style={{ backgroundColor: colors.bg, ...style }}
    >
      <Text className="text-sm font-semibold" style={{ color: colors.color }}>
        {String(label)}
      </Text>
    </View>
  );
}
