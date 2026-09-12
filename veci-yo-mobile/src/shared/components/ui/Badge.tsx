import React from 'react';
import { View, Text } from 'react-native';

const statusMap: Record<string, { bg: string; color: string }> = {
  'Entregado':    { bg: '#6B7280', color: '#fff' },
  'En Portería':  { bg: '#CA8A04', color: '#fff' },
  'No Recibido':  { bg: '#111827', color: '#fff' },
  'Aceptado':     { bg: '#2563EB', color: '#fff' },
  'Pendiente':    { bg: '#E5E7EB', color: '#6B7280' },
  'Rechazado':    { bg: '#EF4444', color: '#fff' },
  'Ingresado':    { bg: '#16A34A', color: '#fff' },
  'Aprobado':     { bg: '#16A34A', color: '#fff' },
  'Denegado':     { bg: '#EF4444', color: '#fff' },
  'Verificado':   { bg: '#16A34A', color: '#fff' },
  'No coincide':  { bg: '#EF4444', color: '#fff' },
  'En curso':     { bg: '#2563EB', color: '#fff' },
  'Resuelto':     { bg: '#16A34A', color: '#fff' },
  'Reservado':    { bg: '#F5B800', color: '#111827' },
  'No disponible':{ bg: '#E5E7EB', color: '#6B7280' },
  'Disponible':   { bg: '#2563EB', color: '#fff' },
  'Activa':       { bg: '#F5B800', color: '#111827' },
  'Finalizado':   { bg: '#2563EB', color: '#fff' },
};

interface BadgeProps {
  status: string;
  children?: React.ReactNode;
  style?: object;
}

export function Badge({ status, children, style }: BadgeProps) {
  const label = children || status;
  const colors = statusMap[status] || { bg: '#E5E7EB', color: '#6B7280' };

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
