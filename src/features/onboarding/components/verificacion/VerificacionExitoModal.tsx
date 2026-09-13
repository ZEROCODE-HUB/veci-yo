import { View, Text } from "react-native";
import { Button, Modal } from "@/shared/components";
import type { UseVerificacionReturn } from "../../types";

interface VerificacionExitoModalProps {
  estado: UseVerificacionReturn;
}

export function VerificacionExitoModal({
  estado,
}: VerificacionExitoModalProps) {
  const cerrar = () => estado.setShowExito(false);

  return (
    <Modal visible={estado.showExito} onClose={cerrar} showClose={false}>
      <View className="items-center gap-4 py-2">
        <Text className="text-[44px]">✅</Text>
        <Text className="text-lg font-bold text-gray-900 text-center leading-6">
          ¡Validación de vida exitosa! Revisa el estado en tus notificaciones.
        </Text>
        <Text className="text-sm text-gray-500 text-center leading-5">
          Si alguna parte de la verificación no se valida correctamente, solo
          tendrás que rehacer esa parte — no todo el proceso.
        </Text>
        <Button onPress={cerrar}>Aceptar</Button>
      </View>
    </Modal>
  );
}
