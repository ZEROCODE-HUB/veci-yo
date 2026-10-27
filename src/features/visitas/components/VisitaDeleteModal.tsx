import { theme } from "@/config";
import React from "react";
import { View, Text } from "react-native";
import { Modal, Badge, Button } from "@/shared/components";
import { TIPO_LABELS, TIPO_ICONS } from "../constants";
import type { VisitaItem } from "@/shared/types";

interface VisitaDeleteModalProps {
  visible: boolean;
  item: VisitaItem | null;
  onConfirm: () => void;
  onCancel: () => void;
  /** Mientras la base lo borra: el botón lo dice y no se cierra (Para Claude 110). */
  eliminando?: boolean;
}

export function VisitaDeleteModal({
  visible,
  item,
  onConfirm,
  onCancel,
  eliminando = false,
}: VisitaDeleteModalProps) {
  if (!item) return null;
  const esReserva = item.tipo === "huesped-temporal";

  const tipoLabel = TIPO_LABELS[item.tipo] || item.tipo;
  const tipoIcon = TIPO_ICONS[item.tipo] || "📌";

  return (
    <Modal
      visible={visible}
      onClose={eliminando ? () => undefined : onCancel}
      title={esReserva ? "Eliminar reserva" : "Eliminar visita"}
    >
      <View className="gap-4">
        <Text className="text-sm text-gray-600 text-center">
          {esReserva
            ? "¿Seguro que quieres eliminar esta reserva? Esta acción no se puede deshacer."
            : "¿Seguro que quieres eliminar esta visita? Esta acción no se puede deshacer."}
        </Text>

        {/* Card preview */}
        <View
          className="rounded-xl p-3.5 gap-2"
          style={{ borderWidth: 1.5, borderColor: theme.colors.border }}
        >
          <View className="flex-row items-center gap-2.5">
            <View
              className="w-10 h-10 rounded-full items-center justify-center"
              style={{ backgroundColor: theme.colors.borderLight }}
            >
              <Text style={{ fontSize: 18 }}>{tipoIcon}</Text>
            </View>
            <View className="flex-1">
              <Text
                className="text-base font-bold text-gray-900"
                numberOfLines={1}
              >
                {item.nombre}
              </Text>
              <Text className="text-xs text-gray-500">
                {item.torre && item.depto
                  ? `${item.torre} - ${item.depto}`
                  : "Sin ubicación"}{" "}
                · {tipoLabel}
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
            <Button variant="secondary" fullWidth onPress={onCancel} disabled={eliminando}>
              Cancelar
            </Button>
          </View>
          <View className="flex-1">
            <Button variant="danger" fullWidth onPress={onConfirm} loading={eliminando}>
              {eliminando ? "Eliminando…" : "Eliminar"}
            </Button>
          </View>
        </View>
      </View>
    </Modal>
  );
}
