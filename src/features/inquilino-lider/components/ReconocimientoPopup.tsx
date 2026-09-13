import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Modal, Button, Input } from '@/shared/components';
import { useUIStore } from '@/stores';
import { cuadroHonorDepartamentos, reputacionInsigniasVecino } from '@/features/home/homeMockData';
import { reconocimientoSchema, type ReconocimientoFormValues } from '../schemas';

const RECONOCIMIENTOS: Array<{ key: string; label: string; icono: string }> = reputacionInsigniasVecino.map((ins) => ({
  key: ins.key,
  label: ins.label,
  icono: ins.icono,
}));

interface ReconocimientoPopupProps {
  visible: boolean;
  onClose: () => void;
  destinatarioPreseleccionado?: string;
}

export function ReconocimientoPopup({ visible, onClose, destinatarioPreseleccionado }: ReconocimientoPopupProps) {
  const addToast = useUIStore((s) => s.addToast);
  const tieneDestinatario = !!destinatarioPreseleccionado;
  const [searchTerm, setSearchTerm] = useState('');
  const { handleSubmit, reset, setValue, watch } = useForm<ReconocimientoFormValues>({
    resolver: zodResolver(reconocimientoSchema),
    defaultValues: {
      destinatario: destinatarioPreseleccionado || '',
      medalla: '',
    },
  });
  const selected = watch('destinatario');
  const medallaElegida = watch('medalla');

  useEffect(() => {
    reset({ destinatario: destinatarioPreseleccionado || '', medalla: '' });
  }, [destinatarioPreseleccionado, visible, reset]);

  const residentesUnicos = [...new Set(cuadroHonorDepartamentos.map((d) => d.responsable))];
  const filtered = searchTerm
    ? residentesUnicos.filter((n) => n.toLowerCase().includes(searchTerm.toLowerCase()))
    : residentesUnicos;

  const handleConfirm = (values: ReconocimientoFormValues) => {
    addToast(`Reconocimiento "${values.medalla}" enviado a ${values.destinatario}!`, 'success');
    reset({ destinatario: '', medalla: '' });
    setSearchTerm('');
    onClose();
  };

  const handleClose = () => {
    reset({ destinatario: '', medalla: '' });
    setSearchTerm('');
    onClose();
  };

  return (
    <Modal visible={visible} onClose={handleClose} title="Dar reconocimiento">
      <View className="gap-4">
        {!tieneDestinatario && (
          <Input
            label=""
            value={searchTerm}
            onChangeText={setSearchTerm}
            placeholder="Buscar residente..."
          />
        )}

        {!tieneDestinatario && (
          <ScrollView style={{ maxHeight: 240 }} className="gap-1">
            {filtered.map((nombre) => (
              <Pressable
                key={nombre}
                onPress={() => setValue('destinatario', nombre)}
                className="flex-row items-center gap-2.5 py-2.5 px-3.5 rounded-2xl"
                style={{
                  borderWidth: 1.5,
                  borderColor: selected === nombre ? '#F5B800' : 'transparent',
                  backgroundColor: selected === nombre ? '#FFF8E1' : '#F9FAFB',
                }}
              >
                <View
                  className="items-center justify-center rounded-full"
                  style={{ width: 32, height: 32, backgroundColor: '#FFF8E1' }}
                >
                  <Text style={{ fontSize: 14 }}>👤</Text>
                </View>
                <Text className="flex-1 text-sm text-gray-900" style={{ fontWeight: selected === nombre ? '600' : '400' }}>
                  {nombre}
                </Text>
                {selected === nombre && <Text className="text-primary font-bold">✓</Text>}
              </Pressable>
            ))}
            {filtered.length === 0 && (
              <Text className="text-sm text-gray-400 text-center py-5">
                No se encontraron residentes
              </Text>
            )}
          </ScrollView>
        )}

        {tieneDestinatario && (
          <Text className="text-base font-semibold text-gray-900 text-center py-2">
            Reconocer a: {destinatarioPreseleccionado}
          </Text>
        )}

        <View>
          <Text className="text-sm font-semibold text-gray-900 mb-2 text-center">
            Elige un reconocimiento:
          </Text>
          <View className="flex-row gap-2 flex-wrap justify-center">
            {RECONOCIMIENTOS.map((m: { key: string; label: string; icono: string }) => (
              <Pressable
                key={m.key}
                onPress={() => setValue('medalla', m.label)}
                className="items-center gap-1 py-2.5 px-2 rounded-xl flex-1"
                style={{
                  minWidth: 60,
                  borderWidth: 2,
                  borderColor: medallaElegida === m.label ? '#F5B800' : '#E5E7EB',
                  backgroundColor: medallaElegida === m.label ? '#FFF8E1' : '#fff',
                }}
              >
                <Text style={{ fontSize: 28 }}>{m.icono}</Text>
                <Text className="text-2xs text-gray-900 text-center">{m.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <Button
          variant="primary"
          onPress={handleSubmit(handleConfirm)}
          disabled={!selected || !medallaElegida}
        >
          {tieneDestinatario
            ? `Reconocer a ${destinatarioPreseleccionado}`
            : selected
              ? `Reconocer a ${selected}`
              : 'Selecciona un destinatario'}
        </Button>
      </View>
    </Modal>
  );
}
