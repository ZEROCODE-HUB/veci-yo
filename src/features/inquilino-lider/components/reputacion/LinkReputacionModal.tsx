import { View, Text } from "react-native";
import { Button, Modal } from "@/shared/components";
import { QRDisplay } from "@/shared/components/ui/QRDisplay";

interface LinkReputacionModalProps {
  visible: boolean;
  onClose: () => void;
}

export function LinkReputacionModal({
  visible,
  onClose,
}: LinkReputacionModalProps) {
  return (
    <Modal
      visible={visible}
      onClose={onClose}
      title="Link temporal de reputación"
    >
      <View className="gap-4">
        <Text className="text-sm text-gray-500" style={{ lineHeight: 22 }}>
          Este link es válido por 48 hs desde su generación en la app.
        </Text>
        <QRDisplay url="wwww.veciyolink/2342342.com" />
        <Button variant="primary" onPress={onClose}>
          Aceptar
        </Button>
      </View>
    </Modal>
  );
}

