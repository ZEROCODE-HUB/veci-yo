import { View, Text } from "react-native";
import { Button, Modal } from "@/shared/components";
import type { Ubicacion } from "@/shared/types";

interface UbicacionConfirmacionModalProps {
  visible: boolean;
  ubicacion: Ubicacion | null;
  esGuardia: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function UbicacionConfirmacionModal({
  visible,
  ubicacion,
  esGuardia,
  onClose,
  onConfirm,
}: UbicacionConfirmacionModalProps) {
  return (
    <Modal visible={visible} onClose={onClose} title="Eliminar ubicación">
      <View className="gap-4">
        <Text className="text-base text-center text-gray-900">
          ¿Seguro que deseas eliminar esta ubicación?
        </Text>
        {ubicacion && (
          <View className="border rounded-xl p-3.5 gap-1" style={{ borderColor: "#F5B800" }}>
            <Text className="text-base font-bold text-gray-900">
              {esGuardia
                ? `Guardia de seguridad: ${ubicacion.alias || ubicacion.direccion}`
                : ubicacion.direccion}
            </Text>
            <Text className="text-sm text-gray-500">
              {esGuardia
                ? `Guardia de seguridad: ${ubicacion.alias || ubicacion.direccion}`
                : `Alias: ${ubicacion.alias}`}
            </Text>
          </View>
        )}
        <Button variant="danger" onPress={onConfirm}>
          Eliminar
        </Button>
      </View>
    </Modal>
  );
}

