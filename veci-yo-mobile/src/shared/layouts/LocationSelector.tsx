import React, { useState } from 'react';
import { View, Text, Pressable, Modal, FlatList } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useUbicacionStore } from '@/stores/ubicacion-store';
import { useAuthStore } from '@/stores/auth-store';
import { navigateToActiveTab } from '@/navigation/helpers/navigation.helpers';

interface LocationSelectorProps {
  showInfoButton?: boolean;
  onInfoPress?: () => void;
}

export function LocationSelector({ showInfoButton = false, onInfoPress }: LocationSelectorProps) {
  const navigation = useNavigation<any>();
  const { ubicaciones, edificioActivo, toggleFavoritoUbicacion } = useUbicacionStore();
  const { rolActivo } = useAuthStore();

  const [open, setOpen] = useState(false);

  const ubicacionActiva = ubicaciones.find((u) => u.favorito) || ubicaciones[0];
  const sinUbicaciones = ubicaciones.length === 0;

  const getLabel = () => {
    if (sinUbicaciones) return 'Administrar mis ubicaciones';
    if (rolActivo === 'guardia') return `Guardia ${edificioActivo || ubicacionActiva?.alias || ubicacionActiva?.direccion || ''}`;
    if (rolActivo === 'administrador') return `Admin, ${ubicacionActiva?.alias || ubicacionActiva?.direccion || ''}`;
    return ubicacionActiva?.alias || ubicacionActiva?.direccion || '';
  };

  const handlePress = () => {
    if (sinUbicaciones) {
      navigateToActiveTab(navigation, 'InquilinoLiderUbicacion');
    } else {
      setOpen(true);
    }
  };

  const seleccionarUbicacion = (id: number) => {
    toggleFavoritoUbicacion(id);
    setOpen(false);
  };

  const irAAdministrar = () => {
    setOpen(false);
    navigateToActiveTab(navigation, 'InquilinoLiderUbicacion');
  };

  return (
    <>
      <Pressable
        onPress={handlePress}
        className="flex-row items-center gap-1"
      >
        <Text className="text-sm font-medium text-gray-700 underline" numberOfLines={1}>
          {getLabel()}
        </Text>
        <Ionicons name="chevron-down" size={14} color="#111827" />
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable onPress={() => setOpen(false)} className="flex-1">
          <View className="absolute right-4 top-14 bg-white rounded-xl shadow-lg border border-gray-200 min-w-[200px] overflow-hidden z-50">
            <FlatList
              data={ubicaciones}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => {
                const isActive = item.id === ubicacionActiva?.id;
                return (
                  <Pressable
                    onPress={() => seleccionarUbicacion(item.id)}
                    className="px-4 py-3 border-b border-gray-100"
                    style={{
                      backgroundColor: isActive ? '#FFF8E1' : 'transparent',
                    }}
                  >
                    <Text className="text-sm text-gray-900" numberOfLines={1}>
                      {rolActivo === 'guardia'
                        ? `Guardia de seguridad: ${item.alias || item.direccion}`
                        : rolActivo === 'administrador'
                          ? `Administrador, ${item.alias || item.direccion}`
                          : item.alias || item.direccion}
                    </Text>
                  </Pressable>
                );
              }}
            />
            <Pressable
              onPress={irAAdministrar}
              className="px-4 py-3"
            >
              <Text className="text-sm font-medium text-primary">
                Administrar mis ubicaciones
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}
