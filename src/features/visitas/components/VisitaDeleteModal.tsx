import React from 'react';
import { View, Text } from 'react-native';
import { Modal, Badge } from '@/shared/components';
import { TIPO_LABELS, TIPO_ICONS } from '@/data';
import type { VisitaItem } from '@/shared/types';

interface VisitaDeleteModalProps {
  visible: boolean;
  item: VisitaItem | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export function VisitaDeleteModal({ visible, item, onConfirm, onCancel }: VisitaDeleteModalProps) {
  if (!item) return null;

  const tipoLabel = TIPO_LABELS[item.tipo] || item.tipo;
  const tipoIcon = TIPO_ICONS[item.tipo] || '📌';

  return (
    <Modal visible={visible} onClose={onCancel} title="Eliminar visita">
      <View className="gap-4">
        <Text className="text-sm text-gray-600 text-center">
          ¿Seguro que desea eliminar esta visita? Esta acción no se puede deshacer.
        </Text>

        {/* Card preview */}
        <View
          className="rounded-xl p-3.5 gap-2"
          style={{ borderWidth: 1.5, borderColor: '#E5E7EB' }}
        >
          <View className="flex-row items-center gap-2.5">
            <View
              className="w-10 h-10 rounded-full items-center justify-center"
              style={{ backgroundColor: '#F3F4F6' }}
            >
              <Text style={{ fontSize: 18 }}>{tipoIcon}</Text>
            </View>
            <View className="flex-1">
              <Text className="text-base font-bold text-gray-900" numberOfLines={1}>{item.nombre}</Text>
              <Text className="text-xs text-gray-500">
                {item.torre && item.depto ? `${item.torre} - ${item.depto}` : 'Sin ubicación'} · {tipoLabel}
              </Text>
            </View>
          </View>
          <View className="flex-row items-center justify-between">
            <Badge status={item.estado} />
            {item.fechaDesde ? (
              <Text className="text-xs text-gray-400">{item.fechaDesde}</Text>
            ) : null}
          </View>
        </View>

        {/* Actions */}
        <View className="flex-row gap-3">
          <View className="flex-1">
            <Text
              onPress={onCancel}
              className="text-center py-3 rounded-xl font-semibold text-sm"
              style={{ backgroundColor: '#F3F4F6', color: '#6B7280' }}
            >
              Cancelar
            </Text>
          </View>
          <View className="flex-1">
            <Text
              onPress={onConfirm}
              className="text-center py-3 rounded-xl font-semibold text-sm"
              style={{ backgroundColor: '#EF4444', color: '#fff' }}
            >
              Eliminar
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}
