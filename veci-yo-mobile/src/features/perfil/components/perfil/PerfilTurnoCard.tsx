import { View, Text } from 'react-native';
import type { GuardiaPerfil } from '../../types/perfil';

export function PerfilTurnoCard({ guardia, turno }: { guardia: GuardiaPerfil; turno: { dia: string; hora: string } | null }) {
  return (
    <View className="bg-white rounded-xl p-4 gap-2.5" style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3 }}>
      <View className="flex-row items-center gap-2"><Text style={{ fontSize: 20 }}>🕐</Text><Text className="text-base font-bold text-gray-900">Mi Turno</Text></View>
      {turno ? (
        <View className="gap-1.5">
          <View className="flex-row items-center justify-between"><Text className="text-sm text-gray-500">Estado:</Text><Text className="text-sm font-semibold text-green-600">En turno activo</Text></View>
          <View className="flex-row items-center justify-between"><Text className="text-sm text-gray-500">Horario:</Text><Text className="text-sm font-medium text-gray-900">{turno.hora}</Text></View>
          <View className="flex-row items-center justify-between"><Text className="text-sm text-gray-500">Garita:</Text><Text className="text-sm text-gray-900">{guardia.garita}</Text></View>
        </View>
      ) : (
        <View className="gap-1.5">
          <View className="flex-row items-center justify-between"><Text className="text-sm text-gray-500">Estado:</Text><Text className="text-sm font-medium text-gray-400">Sin turno activo</Text></View>
          <Text className="text-xs text-gray-500">Tus turnos configurados: {guardia.turnos?.map((item) => `${item.dia} ${item.hora}`).join(' · ')}</Text>
        </View>
      )}
    </View>
  );
}

