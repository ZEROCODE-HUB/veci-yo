import { Button, Modal } from "@/shared/components";
import { Text, View } from "react-native";
export function AnuncioSuccessModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} onClose={onClose} title="Crear anuncio">
      <View className="gap-4 items-center">
        <Text className="text-base font-semibold text-gray-900 text-center">
          ¡Su anuncio se publicó con éxito!
        </Text>
        <Button variant="primary" fullWidth onPress={onClose}>
          Aceptar
        </Button>
      </View>
    </Modal>
  );
}
