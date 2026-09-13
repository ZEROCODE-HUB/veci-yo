import { Text, View } from "react-native";
import { Button, Modal } from "@/shared/components";

export function ReglaDescargaModal({
  visible,
  file,
  onClose,
}: {
  visible: boolean;
  file: string;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} onClose={onClose} title="Descarga de reglamento">
      <View className="items-center gap-4">
        <Text className="text-base font-semibold text-gray-900 text-center">
          {file}
        </Text>
        <Button fullWidth onPress={onClose}>
          Aceptar
        </Button>
      </View>
    </Modal>
  );
}
