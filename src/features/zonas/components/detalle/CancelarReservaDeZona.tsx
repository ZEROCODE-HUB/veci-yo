import React from "react";
import { Text, View } from "react-native";
import { Button, Modal } from "@/shared/components";

/** Confirmar que se cancela una reserva de zona común. */
export function CancelarReservaDeZona({
  visible,
  onVolver,
  onCancelar,
}: {
  visible: boolean;
  onVolver: () => void;
  onCancelar: () => void;
}) {
  return (
    <Modal visible={visible} onClose={onVolver} title="Cancelar reserva">
      <View className="gap-4">
        <Text className="text-sm text-gray-600 text-center">
          ¿Seguro que quieres cancelar esta reserva? La franja vuelve a quedar
          libre para otros vecinos.
        </Text>
        <View className="flex-row gap-3">
          <View className="flex-1">
            {/*
              «Volver» y no «Cancelar»: en este modal cancelar es justo lo que
              hace el otro boton, y dos botones con la misma palabra y efectos
              opuestos es peor que la palabra mal puesta de antes.
            */}
            <Button variant="secondary" onPress={onVolver}>
              Volver
            </Button>
          </View>
          <View className="flex-1">
            <Button variant="danger" onPress={onCancelar}>
              Cancelar reserva
            </Button>
          </View>
        </View>
      </View>
    </Modal>
  );
}
