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

  /**
   * Decía "¡Validación de vida exitosa! Revisa el estado en tus
   * notificaciones" y no había ocurrido nada: las fotos no se suben a ningún
   * sitio, no se comprueba ningún documento y no llega ninguna notificación.
   *
   * Mientras no exista la verificación de verdad —hace falta un proveedor—, lo
   * único honesto es decir que queda por revisar. Anunciar un éxito que no
   * pasó es peor que no tener la pantalla: la portería confía en esa marca.
   */
  return (
    <Modal visible={estado.showExito} onClose={cerrar} showClose={false}>
      <View className="items-center gap-4 py-2">
        <Text className="text-[44px]">🕓</Text>
        <Text className="text-lg font-bold text-gray-900 text-center leading-6">
          Recibimos tus fotos
        </Text>
        <Text className="text-sm text-gray-500 text-center leading-5">
          La administración del condominio revisa la documentación y confirma
          tu identidad. Hasta entonces tu cuenta figura como no verificada.
        </Text>
        <Button onPress={cerrar}>Aceptar</Button>
      </View>
    </Modal>
  );
}
