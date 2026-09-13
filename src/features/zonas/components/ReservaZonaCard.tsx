import React from 'react';
import { Pressable, Text, View } from 'react-native';
import type { ReservaZona } from '@/shared/types';

interface Props { reserva: ReservaZona; esGuardia: boolean; onPress: () => void; onMenu: () => void; }

export function ReservaZonaCard({ reserva, esGuardia, onPress, onMenu }: Props) {
  const border = esGuardia
    ? reserva.estado === 'Aprobado' ? '#2563EB' : reserva.estado === 'Pendiente' ? '#9CA3AF' : '#EF4444'
    : reserva.estado === 'Aprobado' ? '#16A34A' : reserva.estado === 'Pendiente' ? '#F59E0B' : '#EF4444';
  return (
    <Pressable onPress={onPress} className="bg-white rounded-2xl p-3.5 gap-2.5" style={{ borderLeftWidth: 4, borderLeftColor: border, elevation: 3, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } }}>
      <View className="flex-row items-start justify-between">
        <View className="flex-1"><Text className="text-base font-bold text-gray-900">{reserva.nombre}</Text><Text className="text-sm text-gray-500">{reserva.depto}</Text></View>
        <Pressable onPress={onMenu} className="px-2"><Text className="text-xl text-gray-500">⋮</Text></Pressable>
      </View>
      <View className="flex-row flex-wrap gap-2"><Text className="text-xs text-gray-500">📅 {reserva.fecha || 'Sin fecha'}</Text><Text className="text-xs text-gray-500">🕐 {reserva.horario}</Text><Text className="text-xs text-gray-500">👤 {reserva.personas?.length || 0}</Text></View>
      <View className="flex-row items-center justify-between"><Text className="text-xs px-2 py-1 rounded-full" style={{ color: border, backgroundColor: `${border}18` }}>{reserva.estado}</Text><Text className="text-xs text-gray-500">Reserva N° {reserva.reservaNum}</Text></View>
    </Pressable>
  );
}
