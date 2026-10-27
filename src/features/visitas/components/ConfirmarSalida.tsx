import { theme } from "@/config";
import React from "react";
import { Text, View } from "react-native";
import { Button } from "@/shared/components";

/**
 * «¿Registrar la salida ahora?», en línea y no en un modal: la ficha de la
 * portería ya vive dentro de uno, y apilarlos deja el segundo detrás.
 * Lo pidió el cliente el 27/10/2026 (hueco 31): con un interruptor era fácil
 * marcar la salida sin querer.
 */
export function ConfirmarSalida({
  definitiva,
  onCancelar,
  onConfirmar,
}: {
  /** En una visita corriente la salida ya no se deshace. */
  definitiva: boolean;
  onCancelar: () => void;
  onConfirmar: () => void;
}) {
  return (
    <View
      className="gap-2 rounded-xl p-3"
      style={{ backgroundColor: theme.colors.warningLight }}
    >
      <Text className="text-sm text-gray-900">
        {definitiva
          ? "¿Registrar la salida ahora? Una vez registrada no se puede deshacer."
          : "¿Registrar la salida ahora?"}
      </Text>
      <View className="flex-row gap-2">
        <View className="flex-1">
          <Button variant="secondary" size="sm" fullWidth onPress={onCancelar}>
            Cancelar
          </Button>
        </View>
        <View className="flex-1">
          <Button size="sm" fullWidth onPress={onConfirmar}>
            Sí, registrar salida
          </Button>
        </View>
      </View>
    </View>
  );
}
