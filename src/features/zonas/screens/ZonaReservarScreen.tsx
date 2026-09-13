import React, { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Button, Modal } from '@/shared/components';
import { PageHeader } from '@/shared/layouts';
import { useAuthStore } from '@/stores';
import { zonasComunes } from '@/data';
import { ZonaReservaForm } from '@/features/zonas/components';

interface SuccessReservation {
  depto: string;
  hora: string;
  reservaNum: string;
}

export function ZonaReservarScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const rol = useAuthStore((state) => state.rolActivo);
  const zona = zonasComunes.find((item) => item.id === route.params?.zonaId) || zonasComunes[0];
  const [successReservation, setSuccessReservation] = useState<SuccessReservation | null>(null);

  const closeSuccess = () => {
    setSuccessReservation(null);
    navigation.goBack();
  };

  return (
    <View className="flex-1 bg-white">
      <PageHeader title={`Reserva ${zona.nombre}`} />
      <ScrollView className="flex-1" contentContainerClassName="gap-3.5">
        <ZonaReservaForm
          zona={zona}
          rol={rol}
          initialHour={route.params?.horaPre}
          initialDate={route.params?.fechaPre}
          initialDepartment={route.params?.deptoReserva}
          onSuccess={setSuccessReservation}
        />
      </ScrollView>
      <Modal
        visible={!!successReservation}
        onClose={closeSuccess}
        title={`Reserva ${zona.nombre} N°${successReservation?.reservaNum || ''}`}
      >
        <View className="items-center gap-4">
          <Text className="text-lg font-semibold text-center">Se reservo con exito la zona comun</Text>
          <View className="w-full rounded-2xl p-4 gap-2" style={{ borderWidth: 1.5, borderColor: '#F5B800' }}>
            <Text className="font-bold">{successReservation?.depto}</Text>
            <Text className="text-sm text-gray-500">Reserva N°: {successReservation?.reservaNum}</Text>
            <Text className="text-sm text-gray-500">{successReservation?.hora}</Text>
          </View>
          <Button fullWidth onPress={closeSuccess}>Entendido</Button>
        </View>
      </Modal>
    </View>
  );
}
