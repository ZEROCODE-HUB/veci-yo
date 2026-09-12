import { View, Text } from 'react-native';
import { Button, Modal } from '@/shared/components';

export function ReclamoExitoModal({ creado, onClose }: { creado: { numero: string; categoria: string } | null; onClose: () => void }) {
  return <Modal visible={!!creado} onClose={onClose} title="Se creó su PQRS con éxito">{creado && <View className="gap-4 items-center"><Text className="text-lg font-bold text-gray-900">N°:{creado.numero}</Text><View className="px-4 py-1 rounded-full" style={{ backgroundColor: '#22C55E' }}><Text className="text-sm font-semibold text-white">{creado.categoria}</Text></View><Text className="text-base text-gray-500 text-center" style={{ lineHeight: 22 }}>Podrá ver su estado en todo momento con la ultima fecha de revisión del mismo, le llegara un correo con el detalle del mismo.</Text><Button variant="primary" fullWidth onPress={onClose}>Aceptar</Button></View>}</Modal>;
}

