import React from "react";
import { View, Text } from "react-native";
import { Button, Modal } from "@/shared/components";

interface BienvenidaModalProps {
  visible: boolean;
  nombre?: string;
  onClose: () => void;
  onIniciarVerificacion: () => void;
}

export function BienvenidaModal({
  visible,
  nombre,
  onClose,
  onIniciarVerificacion,
}: BienvenidaModalProps) {
  return (
    <Modal visible={visible} onClose={onClose} showClose={false}>
      <View className="items-center gap-4 py-2">
        <Text style={{ fontSize: 48 }}>🎉</Text>
        <Text className="text-xl font-bold text-gray-900 text-center">
          ¡Bienvenido{nombre ? `, ${nombre}` : ""}!
        </Text>
        <Text className="text-sm text-gray-500 text-center leading-5">
          Tu cuenta fue creada con éxito. Para desbloquear todas las funciones de tu vivienda, verifica tu identidad.
        </Text>
        <Button variant="blue" onPress={onIniciarVerificacion}>
          Iniciar verificación
        </Button>
        <Button variant="secondary" onPress={onClose}>
          Más tarde
        </Button>
      </View>
    </Modal>
  );
}

