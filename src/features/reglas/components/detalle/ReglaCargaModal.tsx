import { Text, View } from "react-native";
import { Button, Modal } from "@/shared/components";

export function ReglaCargaModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} onClose={onClose} title="Carga de reglamento">
      <View className="items-center gap-4">
        <Text className="text-base font-semibold text-gray-900 text-center">
          Residentes Temporales
        </Text>
        <Text className="text-sm text-gray-500 text-center">
          Sube un PDF/Docx.
        </Text>
        <Button variant="secondary" fullWidth onPress={onClose}>
          Elegir archivo
        </Button>
        <Text className="text-xs text-gray-400 text-center">
          Documento antiguo no vigente
        </Text>
        <Button fullWidth onPress={onClose}>
          Aceptar
        </Button>
      </View>
    </Modal>
  );
}
