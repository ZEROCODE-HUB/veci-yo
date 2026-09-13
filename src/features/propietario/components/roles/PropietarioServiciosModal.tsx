import { View, Text } from "react-native";
import { Button, Modal, Toggle } from "@/shared/components";

export function PropietarioServiciosModal({
  visible,
  servicios,
  onToggle,
  onClose,
}: {
  visible: boolean;
  servicios: Record<string, boolean>;
  onToggle: (key: string) => void;
  onClose: () => void;
}) {
  return (
    <Modal
      visible={visible}
      onClose={onClose}
      title="Configurar servicios del inquilino"
    >
      <View className="flex-col gap-4">
        <Text className="text-sm text-gray-900" style={{ lineHeight: 22 }}>
          Elija que paga el inquilino del departamento
        </Text>
        <View
          className="rounded-xl overflow-hidden"
          style={{ borderWidth: 1, borderColor: "#E5E7EB" }}
        >
          <View
            className="flex-row justify-between px-4 py-2.5"
            style={{
              backgroundColor: "#F9FAFB",
              borderBottomWidth: 1,
              borderBottomColor: "#E5E7EB",
            }}
          >
            <Text className="text-sm font-semibold text-gray-900">
              Servicios
            </Text>
            <Text className="text-sm font-semibold text-gray-900">Estado</Text>
          </View>
          {Object.entries(servicios).map(([key, value], index, array) => (
            <View
              key={key}
              className="flex-row items-center justify-between px-4 py-3"
              style={{
                borderBottomWidth: index < array.length - 1 ? 1 : 0,
                borderBottomColor: "#F3F4F6",
              }}
            >
              <Text className="text-base text-gray-900 capitalize">{key}</Text>
              <Toggle value={value} onChange={() => onToggle(key)} />
            </View>
          ))}
        </View>
        <Button variant="primary" onPress={onClose}>
          Aceptar
        </Button>
      </View>
    </Modal>
  );
}
