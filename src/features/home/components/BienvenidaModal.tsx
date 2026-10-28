import React from "react";
import { View, Text } from "react-native";
import { Button, Modal } from "@/shared/components";

interface BienvenidaModalProps {
  visible: boolean;
  nombre?: string;
  onClose: () => void;
}

export function BienvenidaModal({
  visible,
  nombre,
  onClose,
}: BienvenidaModalProps) {
  return (
    <Modal visible={visible} onClose={onClose} showClose={false}>
      <View className="items-center gap-4 py-2">
        <Text style={{ fontSize: 48 }}>🎉</Text>
        <Text className="text-xl font-bold text-gray-900 text-center">
          ¡Bienvenido{nombre ? `, ${nombre}` : ""}!
        </Text>
        <Text className="text-sm text-gray-500 text-center leading-5">
          Tu cuenta fue creada con éxito. Ya puedes usar Veciyo.
        </Text>
        {/*
          Llevaba a «Verificación de identidad», que pedía el documento y una
          selfie y no guardaba nada. Se quitó (hueco 55, 28/10/2026): el
          documento lo verifica la administración o la portería, y del huésped
          ya se pide en su preregistro. «Comencemos» sigue: lo acordado el
          04/07/2026 es que la primera acción sea una invitación, no un trámite.
        */}
        <Button variant="blue" onPress={onClose}>
          Comencemos
        </Button>
      </View>
    </Modal>
  );
}

