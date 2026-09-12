import { View, Text } from 'react-native';
import { Button, Input, Toggle } from '@/shared/components';

interface Props {
  alias: string;
  usaCuadroHonor: boolean;
  usaZonas: boolean;
  onAliasChange: (value: string) => void;
  onCuadroHonorChange: (value: boolean) => void;
  onZonasChange: (value: boolean) => void;
  onGuardar: () => void;
}

export function PerfilAliasCard(props: Props) {
  return (
    <View className="bg-white rounded-xl p-4 gap-3" style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3 }}>
      <View><Text className="text-base font-bold text-gray-900">Alias / Anonimato</Text><Text className="text-xs text-gray-500 mt-1">Tu alias se muestra en lugar de tu nombre real en las secciones que elijas.</Text></View>
      <Input label="Alias sugerido (editable)" value={props.alias} onChangeText={props.onAliasChange} placeholder="GuilleSv" />
      <View className="flex-row justify-between items-center"><Text className="text-sm text-gray-900">Usar alias en Cuadro de Honor</Text><Toggle value={props.usaCuadroHonor} onChange={props.onCuadroHonorChange} /></View>
      <View className="flex-row justify-between items-center"><Text className="text-sm text-gray-900">Usar alias en Zonas Comunes y reservas</Text><Toggle value={props.usaZonas} onChange={props.onZonasChange} /></View>
      <Text className="text-xs text-gray-400 p-2.5 rounded-xl" style={{ backgroundColor: '#F9FAFB' }}>Seguridad y Administración siempre ven tu nombre real, sin importar el alias.</Text>
      <Button variant="primary" onPress={props.onGuardar}>Guardar alias</Button>
    </View>
  );
}

