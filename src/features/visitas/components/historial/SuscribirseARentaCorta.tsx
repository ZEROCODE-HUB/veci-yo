import React from "react";
import { Text, View } from "react-native";
import { theme } from "@/config";
import { Button, Modal } from "@/shared/components";

/**
 * La ventana que sale al tocar «Huésped temporal» sin renta corta activa.
 *
 * Salió de `VisitasHistorialScreen` el 26/10/2026; hace lo mismo que hacía allí.
 */
export function SuscribirseARentaCorta({
  visible,
  onClose,
  onSuscribirse,
}: {
  visible: boolean;
  onClose: () => void;
  onSuscribirse: () => void;
}) {
  return (
    <Modal visible={visible} onClose={onClose} title="Veciyo Huésped Temporal">
      <View className="gap-4 items-center">
        <View
          className="w-full h-40 rounded-2xl items-center justify-center"
          style={{ backgroundColor: theme.colors.borderLight }}
        >
          <Text style={{ fontSize: 42 }}>▶️</Text>
        </View>
        <Text className="text-sm text-gray-700 text-center">
          Activa la renta corta de esta vivienda para registrar huéspedes
          temporales, mandarles su preregistro y reportarlos.
        </Text>
        <Button variant="primary" fullWidth onPress={onSuscribirse}>
          Suscribirse
        </Button>
      </View>
    </Modal>
  );
}
