import { View, Text, Pressable } from 'react-native';
import { Badge } from '@/shared/components';
import type { Reclamo } from '@/stores/perfil-store';

export function ReclamoTarjeta({ reclamo, onPress }: { reclamo: Reclamo; onPress: () => void }) {
  return <Pressable onPress={onPress} className="rounded-2xl p-3.5 gap-1" style={{ backgroundColor: '#fff', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3 }}><View className="flex-row items-center gap-1.5 mb-0.5"><Text style={{ fontSize: 16 }}>📋</Text><Text className="font-semibold text-base text-gray-900">PQRS #{reclamo.numero}</Text></View><Text className="font-semibold text-base text-gray-900">{reclamo.nombre}</Text><Text className="text-sm text-gray-500">CI: {reclamo.ci}</Text><View className="flex-row items-center justify-between mt-1"><Badge status={reclamo.estado} /><Text className="text-sm text-gray-500">{reclamo.fechaCreacion}</Text></View></Pressable>;
}

