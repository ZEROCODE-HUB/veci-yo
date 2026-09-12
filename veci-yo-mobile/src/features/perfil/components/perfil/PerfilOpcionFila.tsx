import { View, Text, Pressable } from 'react-native';

export function PerfilOpcionFila({ emoji, label, onPress }: { emoji: string; label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center gap-3.5 py-4 px-4"
      style={{ backgroundColor: '#fff', borderRadius: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3 }}
    >
      <Text style={{ fontSize: 20 }}>{emoji}</Text>
      <Text className="flex-1 text-base font-medium text-gray-900">{label}</Text>
      <Text style={{ fontSize: 18, color: '#9CA3AF' }}>→</Text>
    </Pressable>
  );
}

