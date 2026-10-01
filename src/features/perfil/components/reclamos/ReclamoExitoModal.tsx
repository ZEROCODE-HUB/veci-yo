import { View, Text } from "react-native";
import { theme } from "@/config";
import { Button, Modal } from "@/shared/components";

interface Props {
  creado: { numero: string; area: string } | null;
  onClose: () => void;
}

export function ReclamoExitoModal({ creado, onClose }: Props) {
  return (
    <Modal visible={!!creado} onClose={onClose} title="Se creó su PQRS con éxito">
      {creado && (
        <View className="gap-4 items-center">
          <Text className="text-lg font-bold text-gray-900">
            N°: {creado.numero}
          </Text>
          <View
            className="px-4 py-1 rounded-full"
            style={{ backgroundColor: theme.colors.success }}
          >
            <Text className="text-sm font-semibold text-white">
              {creado.area}
            </Text>
          </View>
          <Text
            className="text-base text-gray-500 text-center"
            style={{ lineHeight: 22 }}
          >
            Podrá ver su estado en todo momento, con la última fecha de revisión.
          </Text>
          <Button variant="primary" fullWidth onPress={onClose}>
            Aceptar
          </Button>
        </View>
      )}
    </Modal>
  );
}
